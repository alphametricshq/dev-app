import { Topbar } from "@/components/topbar";
import { SdkView } from "@/components/sdk/sdk-view";

export const dynamic = "force-dynamic";

export default function SdkPage() {
  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="SDK Alphametrics"
        subtitle="Skills, agents, MCPs e ferramentas que deixam o ambiente do dev pronto."
      />
      <div className="flex min-h-0 flex-1 flex-col px-8 py-6">
        <SdkView />
      </div>
    </div>
  );
}
