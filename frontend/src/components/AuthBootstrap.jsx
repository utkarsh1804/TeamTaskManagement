import { useEffect } from "react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

const AuthBootstrap = () => {
  const setUser = useAuthStore((state) => state.setUser);
  const setReady = useAuthStore((state) => state.setReady);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const { data } = await api.get("/auth/me");
        if (!active) return;
        if (data?.user) {
          setUser(data.user);
        } else {
          setReady();
        }
      } catch (error) {
        if (active) {
          setReady();
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [setUser, setReady]);

  return null;
};

export default AuthBootstrap;
