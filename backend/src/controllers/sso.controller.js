const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const { issueTokens, setAuthCookies } = require("../lib/auth");
const logger = require("../lib/logger");

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";

const providers = {
  google: {
    clientId: () => process.env.GOOGLE_CLIENT_ID,
    clientSecret: () => process.env.GOOGLE_CLIENT_SECRET,
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "openid email profile",
    userInfo: async (accessToken) => {
      const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const d = await r.json();
      return { providerUserId: d.sub, email: d.email, name: d.name || d.email };
    },
  },
  microsoft: {
    clientId: () => process.env.MICROSOFT_CLIENT_ID,
    clientSecret: () => process.env.MICROSOFT_CLIENT_SECRET,
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scope: "openid email profile User.Read",
    userInfo: async (accessToken) => {
      const r = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const d = await r.json();
      return { providerUserId: d.id, email: d.mail || d.userPrincipalName, name: d.displayName || d.mail };
    },
  },
};

const redirectUri = (name) => `${BACKEND_URL}/api/auth/sso/${name}/callback`;
const isConfigured = (p) => Boolean(p.clientId() && p.clientSecret());

const status = (req, res) => {
  res.json({
    google: isConfigured(providers.google),
    microsoft: isConfigured(providers.microsoft),
  });
};

const start = (req, res) => {
  const provider = providers[req.params.provider];
  if (!provider) {
    return res.status(404).json({ success: false, error: "Unknown provider", code: "NOT_FOUND" });
  }
  if (!isConfigured(provider)) {
    return res
      .status(503)
      .json({ success: false, error: `${req.params.provider} SSO is not configured`, code: "SSO_NOT_CONFIGURED" });
  }
  const params = new URLSearchParams({
    client_id: provider.clientId(),
    redirect_uri: redirectUri(req.params.provider),
    response_type: "code",
    scope: provider.scope,
    state: crypto.randomBytes(16).toString("hex"),
    access_type: "offline",
    prompt: "select_account",
  });
  res.redirect(`${provider.authUrl}?${params.toString()}`);
};

const callback = async (req, res) => {
  const name = req.params.provider;
  const provider = providers[name];
  const fail = (reason) => res.redirect(`${FRONTEND_URL}/login?sso_error=${reason}`);
  try {
    if (!provider || !isConfigured(provider)) return fail("not_configured");
    const { code } = req.query;
    if (!code) return fail("no_code");

    const tokenResp = await fetch(provider.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: provider.clientId(),
        client_secret: provider.clientSecret(),
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri(name),
      }),
    });
    const tokenData = await tokenResp.json();
    if (!tokenData.access_token) return fail("token_exchange");

    const profile = await provider.userInfo(tokenData.access_token);
    if (!profile.email) return fail("no_email");

    let account = await prisma.oAuthAccount.findUnique({
      where: { provider_providerUserId: { provider: name, providerUserId: String(profile.providerUserId) } },
    });

    let user;
    if (account) {
      user = await prisma.user.findUnique({ where: { id: account.userId }, select: { id: true, globalRole: true } });
    } else {
      user = await prisma.user.findUnique({ where: { email: profile.email } });
      if (!user) {
        const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 12);
        user = await prisma.user.create({
          data: { name: profile.name, email: profile.email, passwordHash, globalRole: "MEMBER" },
        });
        const defaultOrg = await prisma.organization.findUnique({ where: { slug: "default" } });
        if (defaultOrg) {
          await prisma.orgMember
            .create({ data: { userId: user.id, orgId: defaultOrg.id, role: "MEMBER" } })
            .catch(() => {});
        }
      }
      await prisma.oAuthAccount.create({
        data: { userId: user.id, provider: name, providerUserId: String(profile.providerUserId), email: profile.email },
      });
    }

    const { accessToken, refreshToken } = await issueTokens(user, req);
    setAuthCookies(res, { accessToken, refreshToken });
    res.redirect(`${FRONTEND_URL}/login?sso_token=${accessToken}`);
  } catch (e) {
    logger.error("SSO callback failed", { provider: name, error: String(e.message || e) });
    fail("server");
  }
};

module.exports = { status, start, callback };
