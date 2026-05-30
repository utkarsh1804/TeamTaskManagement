import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";

const levelStyles = {
  1: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  2: "bg-sky-200 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
  3: "bg-blue-300 text-blue-900 dark:bg-blue-800 dark:text-blue-100",
  4: "bg-blue-500 text-white",
  5: "bg-blue-700 text-white",
};
const LEVEL_LABELS = { 1: "Beginner", 2: "Basic", 3: "Intermediate", 4: "Advanced", 5: "Expert" };

const MySkills = () => {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [level, setLevel] = useState(3);

  const { data } = useQuery({
    queryKey: ["my-skills"],
    queryFn: async () => (await api.get("/skills/me")).data,
  });
  const { data: catalog } = useQuery({
    queryKey: ["skills-catalog"],
    queryFn: async () => (await api.get("/skills")).data,
  });

  const addM = useMutation({
    mutationFn: async ({ skillName, lvl }) => {
      const created = await api.post("/skills", { name: skillName });
      const skillId = created.data.skill.id;
      return api.put("/skills/me", { skillId, level: lvl });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-skills"] });
      qc.invalidateQueries({ queryKey: ["skills-catalog"] });
      qc.invalidateQueries({ queryKey: ["skills-matrix"] });
      setName("");
      setLevel(3);
      toast.success("Skill saved");
    },
    onError: (err) => toast.error(err?.response?.data?.error || "Could not save skill"),
  });

  const removeM = useMutation({
    mutationFn: (skillId) => api.delete(`/skills/me/${skillId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-skills"] });
      qc.invalidateQueries({ queryKey: ["skills-matrix"] });
    },
  });

  const items = data?.items || [];

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          addM.mutate({ skillName: name.trim(), lvl: level });
        }}
        className="flex flex-wrap items-end gap-2 rounded-2xl border border-border bg-card p-4"
      >
        <label className="flex-1 text-xs text-muted-foreground">
          Skill
          <input
            list="skill-catalog"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. React, PostgreSQL"
            className="mt-0.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
          <datalist id="skill-catalog">
            {(catalog?.items || []).map((s) => (
              <option key={s.id} value={s.name} />
            ))}
          </datalist>
        </label>
        <label className="text-xs text-muted-foreground">
          Level
          <select
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
            className="mt-0.5 block rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            {[1, 2, 3, 4, 5].map((l) => (
              <option key={l} value={l}>
                {l} – {LEVEL_LABELS[l]}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" disabled={addM.isPending}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No skills yet. Add your first above.</p>
        ) : (
          items.map((us) => (
            <span
              key={us.id}
              className={`group inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${levelStyles[us.level] || levelStyles[3]}`}
            >
              {us.skill?.name}
              <span className="opacity-70">L{us.level}</span>
              <button type="button" onClick={() => removeM.mutate(us.skillId)} aria-label="Remove skill">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))
        )}
      </div>
    </div>
  );
};

const TeamMatrix = () => {
  const { data } = useQuery({
    queryKey: ["skills-matrix"],
    queryFn: async () => (await api.get("/skills/matrix")).data,
  });

  const skills = data?.skills || [];
  const users = data?.users || [];

  if (skills.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        No skills in the catalog yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-card px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
              Member
            </th>
            {skills.map((s) => (
              <th key={s.id} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground" title={s.category || ""}>
                {s.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const levelBySkill = new Map((u.userSkills || []).map((x) => [x.skillId, x.level]));
            return (
              <tr key={u.id} className="border-t border-border">
                <td className="sticky left-0 z-10 bg-card px-3 py-2 font-medium text-foreground">{u.name}</td>
                {skills.map((s) => {
                  const lvl = levelBySkill.get(s.id);
                  return (
                    <td key={s.id} className="px-2 py-2 text-center">
                      {lvl ? (
                        <span className={`inline-block h-6 w-6 rounded text-center text-xs leading-6 ${levelStyles[lvl]}`}>
                          {lvl}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/30">·</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const SkillsPage = () => {
  const [tab, setTab] = useState("mine");
  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Skills</h1>
        <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setTab("mine")}
            className={`rounded-md px-3 py-1 text-xs font-medium ${tab === "mine" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            My skills
          </button>
          <button
            type="button"
            onClick={() => setTab("matrix")}
            className={`rounded-md px-3 py-1 text-xs font-medium ${tab === "matrix" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            Team matrix
          </button>
        </div>
      </div>
      {tab === "mine" ? <MySkills /> : <TeamMatrix />}
    </section>
  );
};

export default SkillsPage;
