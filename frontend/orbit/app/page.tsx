"use client";

import { useState, useRef } from "react";
import { Play, ChevronRight } from "lucide-react";
import clsx from "clsx";
import {
  PageHeader, MetricCard, Panel, EffectBadge, Button, Hash, TimeAgo
} from "@/components/ui";
import type { SimulateResponse, LogEntry, ExecutionRecord } from "@/types";

const PRESET_ACTIONS = [
  {
    label: 'read_file("/data/report.csv")',
    action: "read_file",
    args: { path: "/data/report.csv" },
    modelOutput: "I need to read the Q3 report to analyze revenue trends.",
  },
  {
    label: 'write_file("/etc/hosts", ...)',
    action: "write_file",
    args: { path: "/etc/hosts", content: "127.0.0.1 evil.example.com" },
    modelOutput: "Writing a new hosts entry.",
  },
  {
    label: 'http_post("stripe.com/charges")',
    action: "http_post",
    args: { url: "https://api.stripe.com/v1/charges", amount: 4200 },
    modelOutput: "Initiating payment for the user's subscription upgrade.",
  },
  {
    label: 'shell_exec("rm -rf /tmp/*")',
    action: "shell_exec",
    args: { cmd: "rm -rf /tmp/*" },
    modelOutput: "Cleaning up temporary files.",
  },
  {
    label: 'memory_snapshot(agent_id)',
    action: "memory_snapshot",
    args: { agent_id: "gpt-4o-orbit" },
    modelOutput: "Saving current agent memory state.",
  },
  {
    label: 'read_file("/home/user/.env")',
    action: "read_file",
    args: { path: "/home/user/.env" },
    modelOutput: "Reading environment configuration.",
  },
];

const INITIAL_EXECUTIONS: ExecutionRecord[] = [
  { execId: "#exec-044", agentId: "gpt-4o-orbit", action: "memory_snapshot", args: {}, effect: "allow", triggeredRule: null, evidenceId: "evid-0xabc1", rootHash: "0xdeadbeef", txHash: "0xcafe1234", timestamp: new Date(Date.now() - 2 * 60000).toISOString() },
  { execId: "#exec-043", agentId: "gpt-4o-orbit", action: "read_file", args: { path: "/data/q3.csv" }, effect: "allow", triggeredRule: null, evidenceId: "evid-0xabc2", rootHash: "0xdeadbeee", txHash: "0xcafe1235", timestamp: new Date(Date.now() - 5 * 60000).toISOString() },
  { execId: "#exec-042", agentId: "gpt-4o-orbit", action: "http_post", args: {}, effect: "hold", triggeredRule: "Require approval: external payments", evidenceId: "evid-0xabc3", rootHash: "0xdeadbeed", txHash: "0xcafe1236", timestamp: new Date(Date.now() - 11 * 60000).toISOString() },
  { execId: "#exec-041", agentId: "gpt-4o-orbit", action: "write_file", args: {}, effect: "block", triggeredRule: "Block system file writes", evidenceId: "evid-0xabc4", rootHash: null, txHash: null, timestamp: new Date(Date.now() - 18 * 60000).toISOString() },
  { execId: "#exec-040", agentId: "gpt-4o-orbit", action: "read_file", args: { path: "/docs/spec.md" }, effect: "allow", triggeredRule: null, evidenceId: "evid-0xabc5", rootHash: "0xdeadbee1", txHash: "0xcafe1237", timestamp: new Date(Date.now() - 25 * 60000).toISOString() },
];

export default function ExecutePage() {
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [agentId, setAgentId] = useState("gpt-4o-orbit");
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [result, setResult] = useState<SimulateResponse | null>(null);
  const [executions, setExecutions] = useState<ExecutionRecord[]>(INITIAL_EXECUTIONS);
  const [stats, setStats] = useState({ total: 44, blocked: 3, held: 2, receipts: 39 });
  const logRef = useRef<HTMLDivElement>(null);

  async function runSimulation() {
    if (running) return;
    setRunning(true);
    setLogs([]);
    setResult(null);

    const preset = PRESET_ACTIONS[selectedPreset];

    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          action: preset.action,
          args: preset.args,
          modelOutput: preset.modelOutput,
        }),
      });
      const data: SimulateResponse = await res.json();

      // Stream logs with delay
      for (const log of data.logs) {
        await delay(180);
        setLogs((prev) => [...prev, log]);
        if (logRef.current) {
          logRef.current.scrollTop = logRef.current.scrollHeight;
        }
      }

      setResult(data);
      setExecutions((prev) => [
        {
          execId: data.execId,
          agentId,
          action: preset.action,
          args: preset.args,
          effect: data.effect,
          triggeredRule: data.triggeredRule,
          evidenceId: data.evidenceId,
          rootHash: data.rootHash,
          txHash: data.txHash,
          timestamp: new Date().toISOString(),
        },
        ...prev.slice(0, 9),
      ]);
      setStats((s) => ({
        total: s.total + 1,
        blocked: data.effect === "block" ? s.blocked + 1 : s.blocked,
        held: data.effect === "hold" ? s.held + 1 : s.held,
        receipts: s.receipts + 1,
      }));
    } catch {
      setLogs((prev) => [...prev, { ts: ts(), level: "error", msg: "fetch error — is the server running?" }]);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="execution pipeline"
        subtitle="intercept · evaluate · bundle · store · receipt"
      >
        <span className="text-[10px] text-[#52525e] border border-[#1f1f23] rounded px-2 py-1">
          agent: {agentId}
        </span>
      </PageHeader>

      <div className="p-6 space-y-5">
        {/* Metrics */}
        <div className="grid grid-cols-4 gap-3">
          <MetricCard label="executions" value={stats.total} sub="all time" />
          <MetricCard label="blocked" value={stats.blocked} sub={`${Math.round((stats.blocked / stats.total) * 100)}% rate`} accent="red" />
          <MetricCard label="held for approval" value={stats.held} accent="amber" />
          <MetricCard label="receipts issued" value={stats.receipts} accent="green" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Simulator */}
          <Panel title="simulate agent action" headerRight={
            <Button variant="green" onClick={runSimulation} disabled={running}>
              <Play size={10} />
              {running ? "running..." : "run"}
            </Button>
          }>
            <div className="p-4 space-y-3">
              {/* Agent ID */}
              <div className="flex items-center gap-3">
                <label className="text-[10px] text-[#52525e] w-16 flex-shrink-0">agent</label>
                <input
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  className="flex-1 bg-[#111113] border border-[#1f1f23] rounded px-2.5 py-1.5 text-[11px] text-[#a1a1aa] font-mono focus:outline-none focus:border-[#2a2a30]"
                />
              </div>

              {/* Action selector */}
              <div className="flex items-start gap-3">
                <label className="text-[10px] text-[#52525e] w-16 flex-shrink-0 mt-1.5">action</label>
                <div className="flex-1 space-y-1">
                  {PRESET_ACTIONS.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedPreset(i)}
                      className={clsx(
                        "w-full text-left px-2.5 py-1.5 rounded text-[11px] font-mono transition-colors",
                        selectedPreset === i
                          ? "bg-[#1f1f23] text-[#e4e4e7] border border-[#2a2a30]"
                          : "text-[#52525e] hover:text-[#a1a1aa] hover:bg-[#111113] border border-transparent"
                      )}
                    >
                      <ChevronRight size={10} className="inline mr-1 opacity-50" />
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pipeline viz */}
              <div className="pt-2">
                <div className="flex items-center gap-1 text-[9px]">
                  {["policy", "evidence", "0G store", "execute", "receipt"].map((step, i) => (
                    <div key={step} className="flex items-center gap-1">
                      <span className={clsx(
                        "px-2 py-0.5 rounded border",
                        result
                          ? i <= 4 ? "border-[#22c55e]/30 text-[#22c55e] bg-[#052e16]"
                          : "border-[#1f1f23] text-[#52525e]"
                          : running && i === 0 ? "border-[#22c55e]/50 text-[#22c55e] animate-pulse"
                          : "border-[#1f1f23] text-[#52525e]"
                      )}>
                        {step}
                      </span>
                      {i < 4 && <span className="text-[#3f3f46]">→</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Terminal log */}
            <div
              ref={logRef}
              className="h-48 overflow-y-auto font-mono text-[11px] p-3 bg-[#070709] border-t border-[#1f1f23] space-y-0.5"
            >
              {logs.length === 0 && (
                <span className="text-[#3f3f46]">BBBB</span>
              )}
              {logs.map((log, i) => (
                <div key={i} className="flex gap-2 animate-fade-in">
                  <span className="log-ts flex-shrink-0">{log.ts}</span>
                  <span className={clsx(
                    log.level === "ok" && "log-ok",
                    log.level === "warn" && "log-warn",
                    log.level === "error" && "log-error",
                    log.level === "info" && "log-info",
                  )}>
                    {log.msg}
                  </span>
                </div>
              ))}
              {result && (
                <div className="mt-2 pt-2 border-t border-[#1f1f23]">
                  <span className="text-[#3f3f46]">AAA</span>
                  <EffectBadge effect={result.effect} />
                  {result.rootHash && (
                    <span className="text-[#3f3f46] ml-2">
                      root: <span className="text-[#22d3ee]">{result.rootHash.slice(0, 18)}...</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </Panel>

          {/* Recent executions */}
          <Panel title="recent executions">
            <div className="divide-y divide-[#111113]">
              {executions.map((exec) => (
                <div key={exec.execId} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#0d0d0f] transition-colors">
                  <span className="text-[#3f3f46] text-[10px] font-mono w-20 flex-shrink-0">
                    {exec.execId}
                  </span>
                  <span className="flex-1 text-[#a1a1aa] text-[11px] truncate">
                    {exec.action}
                    {exec.args && typeof exec.args === 'object' && 'path' in exec.args && (
                      <span className="text-[#52525e]">({String(exec.args.path)})</span>
                    )}
                    {exec.args && typeof exec.args === 'object' && 'url' in exec.args && (
                      <span className="text-[#52525e]">(stripe)</span>
                    )}
                  </span>
                  <EffectBadge effect={exec.effect} />
                  <TimeAgo timestamp={exec.timestamp} />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function ts() {
  return new Date().toISOString().slice(11, 23);
}
