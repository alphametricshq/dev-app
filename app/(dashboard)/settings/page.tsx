import { Topbar } from "@/components/topbar";
import { Github, Trello, KeyRound, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const ghUser = process.env.GITHUB_USERNAME;
  const ghTokenSet = !!process.env.GITHUB_TOKEN;
  const trelloKeySet = !!process.env.TRELLO_API_KEY;
  const trelloTokenSet = !!process.env.TRELLO_TOKEN;
  const trelloLists = process.env.TRELLO_DONE_LIST_IDS;

  return (
    <>
      <Topbar title="Configurações" subtitle="Credenciais e integrações" />
      <div className="mx-auto max-w-3xl space-y-6 px-8 py-6">
        <div className="card">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/15 text-success">
              <Github className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-fg">GitHub</h2>
              <p className="text-xs text-fg-muted">Sincroniza o gráfico de contribuições</p>
            </div>
          </div>
          <div className="space-y-3">
            <Field label="GITHUB_USERNAME" value={ghUser} />
            <Field label="GITHUB_TOKEN" value={ghTokenSet ? "••••••••" : undefined} />
          </div>
          <Steps>
            <Step n={1}>
              Vá em{" "}
              <Ext href="https://github.com/settings/tokens">
                github.com/settings/tokens
              </Ext>{" "}
              e gere um <strong>Personal Access Token (classic)</strong>
            </Step>
            <Step n={2}>
              Marque os escopos: <code className="codepill">read:user</code>{" "}
              <code className="codepill">repo</code> (este último opcional, só pra puxar repos privados)
            </Step>
            <Step n={3}>
              Cole no <code className="codepill">.env.local</code>:
              <pre className="codeblock">GITHUB_USERNAME=seu-usuario{"\n"}GITHUB_TOKEN=ghp_...</pre>
            </Step>
          </Steps>
        </div>

        <div className="card">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/15 text-warning">
              <Trello className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-fg">Trello</h2>
              <p className="text-xs text-fg-muted">Sincroniza tarefas movidas para listas Done</p>
            </div>
          </div>
          <div className="space-y-3">
            <Field label="TRELLO_API_KEY" value={trelloKeySet ? "••••••••" : undefined} />
            <Field label="TRELLO_TOKEN" value={trelloTokenSet ? "••••••••" : undefined} />
            <Field
              label="TRELLO_DONE_LIST_IDS (opcional)"
              value={trelloLists || "(detecção automática por nome)"}
              hint="IDs de listas que representam Done, separadas por vírgula"
            />
          </div>
          <Steps>
            <Step n={1}>
              Acesse{" "}
              <Ext href="https://trello.com/power-ups/admin/">
                trello.com/power-ups/admin
              </Ext>{" "}
              e crie um Power-Up (ou use um existente)
            </Step>
            <Step n={2}>
              Em "API Key", clique em <strong>Generate a new API key</strong> e copie a chave
            </Step>
            <Step n={3}>
              Logo abaixo, clique no link <strong>Token</strong> e autorize — copie o token gerado
            </Step>
            <Step n={4}>
              Cole no <code className="codepill">.env.local</code>:
              <pre className="codeblock">TRELLO_API_KEY=...{"\n"}TRELLO_TOKEN=...</pre>
            </Step>
            <Step n={5}>
              Por padrão, o app detecta listas com nome contendo: <code className="codepill">Done</code>,{" "}
              <code className="codepill">Concluído</code>, <code className="codepill">Feito</code>,{" "}
              <code className="codepill">Finalizado</code>. Pra forçar listas específicas, defina{" "}
              <code className="codepill">TRELLO_DONE_LIST_IDS</code>.
            </Step>
          </Steps>
        </div>

        <div className="card">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-fg">Como aplicar mudanças</h2>
              <p className="text-xs text-fg-muted">As variáveis são lidas do .env.local</p>
            </div>
          </div>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-fg-muted">
            <li>
              Edite o arquivo <code className="codepill">.env.local</code> na raiz do projeto
            </li>
            <li>
              Reinicie o servidor de dev: <code className="codepill">npm run dev</code>
            </li>
            <li>Volte ao dashboard e clique em "Sincronizar agora"</li>
          </ol>
        </div>
      </div>
      <style>{`
        .codepill {
          background: hsl(220 14% 15%);
          border: 1px solid hsl(220 12% 24%);
          padding: 1px 6px;
          border-radius: 4px;
          font-size: 12px;
          font-family: ui-monospace, monospace;
        }
        .codeblock {
          background: hsl(220 18% 7%);
          border: 1px solid hsl(220 12% 18%);
          padding: 10px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-family: ui-monospace, monospace;
          margin-top: 8px;
          color: hsl(220 10% 95%);
        }
      `}</style>
    </>
  );
}

function Field({ label, value, hint }: { label: string; value?: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-bg-subtle px-3 py-2.5">
      <div>
        <div className="font-mono text-xs text-fg-muted">{label}</div>
        {hint && <div className="mt-0.5 text-[11px] text-fg-subtle">{hint}</div>}
      </div>
      <div className="text-sm">
        {value ? (
          <span className="font-mono text-fg">{value}</span>
        ) : (
          <span className="rounded-full bg-danger/15 px-2 py-0.5 text-xs text-danger">não configurado</span>
        )}
      </div>
    </div>
  );
}

function Steps({ children }: { children: React.ReactNode }) {
  return <div className="mt-5 space-y-2.5 border-t border-border pt-4 text-sm">{children}</div>;
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/20 text-[11px] font-semibold text-accent">
        {n}
      </span>
      <div className="text-fg-muted [&_strong]:text-fg">{children}</div>
    </div>
  );
}

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 text-accent underline-offset-2 hover:underline"
    >
      {children}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}
