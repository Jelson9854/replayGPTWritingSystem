"use client"
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Select from "react-select";
import Papa from "papaparse";
import ParticipantStatsPanel from "@/components/participantStatsPanel";
import { ParticipantStats } from "@/components/types";
import { Suspense } from "react";
import { TOKEN_MAP } from "@/lib/tokens";

interface ParticipantOption extends Partial<ParticipantStats> {
  value: string;
  label: string;
  gender?: string;
  age?: string;
  race?: string;
}

// ─── Paper metadata ────────────────────────────────────────────────────────────

const ABSTRACT = `With the rapid adoption of AI writing assistants in education, educators and researchers need empirical evidence to understand the impact on student writing and inform effective pedagogical design. Despite widespread use, we lack systematic understanding of how students engage with these tools during authentic writing tasks: when they seek assistance, what they ask, and how they incorporate AI-generated content into their essays. This gap limits evidence-based policy development and rigorous evaluation of generative AI's learning effects. To address this gap, we introduce NIRVANA, a dataset capturing how university students use generative AI while writing an analytical essay. The dataset includes 77 students who completed an essay task with access to ChatGPT, recording keystroke-level writing behavior, full ChatGPT conversation histories, and all text copied from ChatGPT, enabling a complete reconstruction of the writing process and revealing how AI assistance shapes student work. Our analysis identifies key behavioral patterns, including variation in ChatGPT query frequency and its relationship to essay characteristics such as length and readability. We identify four writing profiles based on students' contribution and revision patterns: Lead Authors, Collaborators, Drafters, and Vibe Writers. To support deeper investigation, we developed a replay interface that reconstructs the writing process; qualitative analysis of sampled replays demonstrates how this tool enables systematic examination of student-AI interactions.`;

const BIBTEX = `@inproceedings{nirvana2025,
  title     = {NIRVANA: A Dataset for Reproducing How Students Use Generative AI for Essay Writing},
  author    = {EchoLab, Virginia Tech},
  year      = {2025}
}`;

const PARTICIPANT_ROLES: Record<number, string> = {
  1: "Collaborator",  2: "Collaborator",  3: "Lead Author",  4: "Lead Author",
  5: "Lead Author",   6: "Vibe Writer",   7: "Collaborator", 8: "Drafter",
  9: "Lead Author",  10: "Drafter",      11: "Collaborator",12: "Collaborator",
 13: "Lead Author",  14: "Vibe Writer",  15: "Lead Author", 16: "Collaborator",
 17: "Lead Author",  18: "Lead Author",  19: "Drafter",     20: "Collaborator",
 21: "Collaborator", 22: "Lead Author",  23: "Lead Author", 24: "Lead Author",
 25: "Lead Author",  26: "Collaborator", 27: "Lead Author", 28: "Collaborator",
 29: "Lead Author",  30: "Lead Author",  31: "Collaborator",32: "Vibe Writer",
 33: "Vibe Writer",  34: "Vibe Writer",  35: "Collaborator",36: "Lead Author",
 37: "Lead Author",  38: "Vibe Writer",  39: "Lead Author", 40: "Lead Author",
 41: "Lead Author",  42: "Vibe Writer",  43: "Drafter",     44: "Lead Author",
 45: "Collaborator", 46: "Lead Author",  47: "Lead Author", 48: "Lead Author",
 49: "Vibe Writer",  50: "Lead Author",  51: "Drafter",     52: "Lead Author",
 53: "Lead Author",  54: "Drafter",      55: "Lead Author", 56: "Vibe Writer",
 57: "Lead Author",  58: "Lead Author",  59: "Drafter",     60: "Vibe Writer",
 61: "Lead Author",  62: "Lead Author",  63: "Lead Author", 64: "Drafter",
 65: "Collaborator", 66: "Collaborator", 67: "Vibe Writer", 68: "Vibe Writer",
 69: "Lead Author",  70: "Drafter",      71: "Drafter",     72: "Lead Author",
 73: "Lead Author",  74: "Vibe Writer",  75: "Drafter",     76: "Lead Author",
 77: "Vibe Writer",
};

function getWriterType(participantNumber: number): string {
  return PARTICIPANT_ROLES[participantNumber] ?? "Lead Author";
}

const WRITER_PROFILES = [
  {
    name: "Lead Authors",
    n: 37,
    hcr: "0.98",
    her: "0.95",
    color: "purple",
    bg: "bg-purple-50",
    border: "border-purple-200",
    badge: "bg-purple-100 text-purple-800",
    heading: "text-purple-900",
    description:
      "Wrote essays primarily independently. ChatGPT was used for idea generation or information search, with little to no AI-generated text retained in the final essay.",
  },
  {
    name: "Collaborators",
    n: 15,
    hcr: "0.53",
    her: "0.62",
    color: "green",
    bg: "bg-green-50",
    border: "border-green-200",
    badge: "bg-green-100 text-green-800",
    heading: "text-green-900",
    description:
      "Worked alongside ChatGPT in a balanced manner. Final essays contained a roughly even mixture of AI-generated and user-written text, with direct revision of pasted content.",
  },
  {
    name: "Drafters",
    n: 11,
    hcr: "0.09",
    her: "0.64",
    color: "orange",
    bg: "bg-orange-50",
    border: "border-orange-200",
    badge: "bg-orange-100 text-orange-800",
    heading: "text-orange-900",
    description:
      "Wrote independent drafts first, then asked ChatGPT to rewrite them. Despite high editing effort, final essays were primarily composed of AI-generated content.",
  },
  {
    name: "Vibe Writers",
    n: 14,
    hcr: "0.01",
    her: "0.06",
    color: "blue",
    bg: "bg-blue-50",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-800",
    heading: "text-blue-900",
    description:
      "Delegated the writing entirely to ChatGPT. Analogous to 'Vibe Coding', these participants generated a full essay via prompts and pasted it with minimal or no personal edits.",
  },
];

const CASE_STUDIES = [
  {
    id: "P77",
    cluster: "Vibe Writers",
    clusterColor: "bg-blue-100 text-blue-800",
    summary:
      "Copied the writing prompt into ChatGPT, received a complete essay, and pasted it directly without revision. A single sharp increase in word count marks the end of the session.",
  },
  {
    id: "P30",
    cluster: "Lead Authors",
    clusterColor: "bg-purple-100 text-purple-800",
    summary:
      "Used ChatGPT exclusively for grammar and vocabulary help. Writing grew steadily, with ideas developed entirely by the student.",
  },
  {
    id: "P57",
    cluster: "Lead Authors",
    clusterColor: "bg-purple-100 text-purple-800",
    summary:
      "Asked ChatGPT for a full essay but used it only as reference material. The submitted essay differed substantially from the AI-generated draft.",
  },
  {
    id: "P54",
    cluster: "Drafters",
    clusterColor: "bg-orange-100 text-orange-800",
    summary:
      "Wrote a three-paragraph draft independently, then asked ChatGPT to elaborate and replaced the original with AI-generated content.",
  },
  {
    id: "P26",
    cluster: "Collaborators",
    clusterColor: "bg-green-100 text-green-800",
    summary:
      "Generated an initial draft with ChatGPT and made minimal edits. Despite being classified as a Collaborator, qualitative review suggests ChatGPT acted as the primary author.",
  },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#861F41] mb-3">
      {children}
    </span>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-3xl font-bold text-gray-900 mb-4">{children}</h2>
  );
}

function StatCard({
  value,
  label,
  sub,
}: {
  value: string;
  label: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col items-center text-center">
      <span className="text-4xl font-extrabold text-[#861F41]">{value}</span>
      <span className="mt-2 text-sm font-semibold text-gray-700">{label}</span>
      {sub && <span className="mt-1 text-xs text-gray-400">{sub}</span>}
    </div>
  );
}

// ─── Academic page sections ────────────────────────────────────────────────────

function PaperHero() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="bg-gradient-to-br from-[#4A1225] via-[#6B1A33] to-[#861F41] text-white py-24 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight mb-4 tracking-tight">
          NIRVANA
        </h1>
        <p className="text-xl sm:text-2xl text-[#F5C5A3] font-medium max-w-3xl mx-auto mb-8 leading-relaxed">
          A Dataset for Reproducing How Students Use Generative AI for Essay Writing
        </p>
        {/* EchoLab branding */}
        <div className="flex flex-col items-center gap-2 mb-10">
          <div className="bg-white rounded-2xl px-6 py-3 shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://wordpress.cs.vt.edu/echolab/wp-content/uploads/sites/105/2018/09/cropped-cropped-cropped-EchoLab-LR-White-Background_Final.png"
              alt="EchoLab"
              className="h-10 w-auto object-contain"
            />
          </div>
          <div className="text-[#F5C5A3] text-sm">Virginia Tech · Blacksburg, VA</div>
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          <a
            href="https://arxiv.org/abs/2604.07344"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-[#861F41]/60 border border-[#E5751F]/60 text-white font-semibold rounded-lg shadow hover:bg-[#E5751F]/30 transition-colors duration-200"
          >
            arXiv
          </a>
          <a
            href="https://arxiv.org/pdf/2604.07344"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-[#861F41]/60 border border-[#E5751F]/60 text-white font-semibold rounded-lg shadow hover:bg-[#E5751F]/30 transition-colors duration-200"
          >
            Paper
          </a>
          <button
            onClick={() => scrollTo("publications")}
            className="px-6 py-3 bg-[#861F41]/60 border border-[#E5751F]/60 text-white font-semibold rounded-lg shadow hover:bg-[#E5751F]/30 transition-colors duration-200"
          >
            Cite
          </button>
          <button
            onClick={() => scrollTo("replay-tool")}
            className="px-6 py-3 bg-[#861F41]/60 border border-[#E5751F]/60 text-white font-semibold rounded-lg shadow hover:bg-[#E5751F]/30 transition-colors duration-200"
          >
            Try the Replay System ↓
          </button>
        </div>
      </div>
    </section>
  );
}

function StickyNav() {
  const links = [
    { label: "Abstract", id: "abstract" },
    { label: "Dataset", id: "dataset" },
    { label: "Findings", id: "findings" },
    { label: "Metrics", id: "metrics" },
    { label: "Writer Profiles", id: "profiles" },
    { label: "Replay System", id: "replay-system" },
    { label: "Publications", id: "publications" },
    { label: "Try It", id: "replay-tool" },
  ];

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 overflow-x-auto">
        <ul className="flex gap-1 py-3 min-w-max">
          {links.map((link) => (
            <li key={link.id}>
              <button
                onClick={() => scrollTo(link.id)}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-[#861F41] hover:bg-[#861F41]/10 rounded-md transition-colors duration-150"
              >
                {link.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

function AbstractSection() {
  return (
    <section id="abstract" className="py-16 px-6 bg-white">
      <div className="max-w-3xl mx-auto">
        <SectionLabel>Abstract</SectionLabel>
        <SectionHeading>Overview</SectionHeading>
        <p className="text-gray-600 leading-relaxed text-lg">{ABSTRACT}</p>
      </div>
    </section>
  );
}

function DatasetSection() {
  return (
    <section id="dataset" className="py-16 px-6 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <SectionLabel>The Dataset</SectionLabel>
        <SectionHeading>NIRVANA at a Glance</SectionHeading>
        <p className="text-gray-600 mb-10 max-w-2xl">
          77 university students completed an analytical essay task with
          unrestricted access to ChatGPT (GPT-3.5-turbo). Every keystroke, GPT
          query, and copy-paste event was recorded — enabling complete
          reconstruction of the writing process.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard value="77" label="Participants" sub="University students" />
          <StatCard
            value="4.51"
            label="Avg. GPT Queries"
            sub="σ = 5.11, median = 2"
          />
          <StatCard
            value="~30 min"
            label="Avg. Session Length"
            sub="Per writing task"
          />
          <StatCard
            value="9.96"
            label="Avg. Dale-Chall Score"
            sub="College reading level (9.0+)"
          />
        </div>
        <div className="mt-10 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            What is captured?
          </h3>
          <ul className="grid sm:grid-cols-3 gap-3 text-sm text-gray-600">
            {[
              "Keystroke-level writing behavior in a browser-based editor",
              "Full ChatGPT conversation histories (queries & responses)",
              "All text copied from ChatGPT responses into the essay editor",
              "Copy and paste events with precise timestamps",
              "Post-study surveys: Self-Efficacy, TAM, Perceived Ownership, CSI",
              "Participant demographics: age, gender, race",
            ].map((item) => (
              <li key={item} className="flex gap-2 items-start">
                <span className="mt-0.5 text-[#861F41] shrink-0">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function FindingsSection() {
  const correlations = [
    {
      x: "Query Count",
      y: "Word Count",
      rho: "0.485",
      p: "p < 0.001",
      note:
        "Students who asked more questions produced longer essays, suggesting ChatGPT may function as a generative scaffold.",
    },
    {
      x: "Query Count",
      y: "Time Spent",
      rho: "0.493",
      p: "p < 0.001",
      note:
        "Higher query frequency was associated with longer sessions — contrary to the expectation that AI use would expedite writing.",
    },
    {
      x: "Query Count",
      y: "Dale-Chall Score",
      rho: "0.380",
      p: "p < 0.001",
      note:
        "More queries correlated with higher readability difficulty scores, consistent with the lexical complexity of LLM-generated text.",
    },
  ];

  return (
    <section id="findings" className="py-16 px-6 bg-white">
      <div className="max-w-4xl mx-auto">
        <SectionLabel>Quantitative Analysis</SectionLabel>
        <SectionHeading>Key Findings</SectionHeading>
        <p className="text-gray-600 mb-10 max-w-2xl">
          Spearman rank correlations reveal significant associations between
          ChatGPT query frequency and writing process outcomes. No significant
          correlations were found between query count and post-task survey
          measures (Perceived Ownership or CSI).
        </p>
        <div className="space-y-4">
          {correlations.map((c) => (
            <div
              key={c.y}
              className="bg-gray-50 border border-gray-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="shrink-0 text-center bg-[#861F41] text-white rounded-xl px-5 py-4 sm:w-36">
                <div className="text-2xl font-extrabold">ρ = {c.rho}</div>
                <div className="text-xs text-[#F5C5A3] mt-1">{c.p}</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-500 mb-1">
                  {c.x} &nbsp;↔&nbsp; {c.y}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed">{c.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WriterProfilesSection() {
  return (
    <section id="profiles" className="py-16 px-6 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <SectionLabel>Cluster Analysis</SectionLabel>
        <SectionHeading>Four Writer Profiles</SectionHeading>
        <p className="text-gray-600 mb-10 max-w-2xl">
          K-means clustering (K=4, selected via silhouette analysis and the
          elbow method) on HCR and HER scores identified four distinct patterns
          of ChatGPT integration. Groups differed significantly in query count,
          time spent, essay readability, and perceived ownership.
        </p>
        <div className="grid sm:grid-cols-2 gap-5">
          {WRITER_PROFILES.map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl border ${p.border} ${p.bg} p-6`}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className={`text-xl font-bold ${p.heading}`}>{p.name}</h3>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${p.badge}`}
                >
                  n = {p.n}
                </span>
              </div>
              <p className="text-gray-700 text-sm mb-4 leading-relaxed">
                {p.description}
              </p>
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="text-gray-500 text-xs block">HCR</span>
                  <span className="font-bold text-gray-800">{p.hcr}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-xs block">HER</span>
                  <span className="font-bold text-gray-800">{p.her}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MetricsSection() {
  return (
    <section id="metrics" className="py-16 px-6 bg-white">
      <div className="max-w-4xl mx-auto">
        <SectionLabel>Novel Metrics</SectionLabel>
        <SectionHeading>HCR & HER</SectionHeading>
        <p className="text-gray-600 mb-10 max-w-2xl">
          To characterize the degree of human involvement in AI-assisted
          writing, we introduce two complementary metrics derived from
          editor-tracked event counts.
        </p>
        <div className="grid sm:grid-cols-2 gap-6">
          {/* HCR */}
          <div className="bg-[#FDF2F5] border border-[#861F41]/30 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-[#861F41] mb-1">
              Human Contribution Ratio
            </h3>
            <span className="text-xs text-[#861F41] font-semibold tracking-wide uppercase">
              HCR
            </span>
            <div className="mt-4 mb-4 bg-white rounded-lg border border-[#861F41]/20 px-4 py-3 font-mono text-sm text-gray-800">
              HCR = (HA − HD) / [(HA − HD) + (GP − GD)]
            </div>
            <p className="text-sm text-gray-700 leading-relaxed mb-3">
              Measures the proportion of user-written words in the final essay.
              A value of <strong>1</strong> means every word was written by the
              participant; <strong>0</strong> means the essay consists entirely
              of pasted ChatGPT text.
            </p>
            <p className="text-xs text-gray-500 italic">
              Limitation: HCR does not capture cases where a participant wrote
              an entire draft and then replaced it with a ChatGPT revision — the
              score would be 0 even though the ideas originated with the student.
            </p>
          </div>

          {/* HER */}
          <div className="bg-[#FFF7F0] border border-[#E5751F]/30 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-[#7A3000] mb-1">
              Human Edit Ratio
            </h3>
            <span className="text-xs text-[#E5751F] font-semibold tracking-wide uppercase">
              HER
            </span>
            <div className="mt-4 mb-4 bg-white rounded-lg border border-[#E5751F]/20 px-4 py-3 font-mono text-sm text-gray-800">
              HER = (HA + HD + GD) / (HA + HD + GP + GD)
            </div>
            <p className="text-sm text-gray-700 leading-relaxed mb-3">
              Measures the proportion of all additions and deletions
              attributable to the participant. Deleting AI-generated content
              counts as human contribution, since it reflects deliberate
              curation. A value of <strong>1</strong> means no AI text was ever
              pasted.
            </p>
            <p className="text-xs text-gray-500 italic">
              Limitation: HER does not capture cognitive effort involved in
              planning, ideation, or deciding whether to incorporate AI output —
              it reflects observable editing effort, not cognitive contribution.
            </p>
          </div>
        </div>

        {/* Variable legend */}
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          {[
            { sym: "HA", def: "Words added by the human" },
            { sym: "HD", def: "Human words deleted" },
            { sym: "GP", def: "Words pasted from ChatGPT" },
            { sym: "GD", def: "ChatGPT words deleted by human" },
          ].map((v) => (
            <div key={v.sym}>
              <span className="font-mono font-bold text-[#861F41]">
                {v.sym}
              </span>
              <span className="text-gray-500"> — {v.def}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ReplaySystemSection() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="replay-system" className="py-16 px-6 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <SectionLabel>The Tool</SectionLabel>
        <SectionHeading>NIRVANA Replay System</SectionHeading>
        <p className="text-gray-600 mb-6 max-w-2xl leading-relaxed">
          Quantitative metrics alone cannot capture all forms of human–AI
          interaction. To support deeper qualitative analysis, we developed a
          web-based replay interface that reconstructs the essay composition
          process event-by-event.
        </p>
        <ul className="mb-10 space-y-2 text-sm text-gray-700 max-w-2xl">
          {[
            "Side-by-side view: essay editor replay alongside the full ChatGPT conversation",
            "Timeline annotated with copy events, paste events, and GPT queries",
            "Variable-speed playback: pause, scrub, or step through specific moments",
            "Word-count-over-time graph revealing sudden AI-generated text insertions",
            "Summary statistics for each session (word counts, query count, survey scores)",
          ].map((f) => (
            <li key={f} className="flex gap-2 items-start">
              <span className="mt-0.5 text-[#861F41] shrink-0">→</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Case Studies
        </h3>
        <p className="text-gray-600 text-sm mb-6 max-w-2xl">
          Two instructors of writing-intensive courses conducted a reflexive
          review of selected sessions. The following cases illustrate how
          process-level replay reveals distinctions that quantitative clustering
          alone may miss.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {CASE_STUDIES.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg font-bold text-gray-900">{c.id}</span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.clusterColor}`}
                >
                  {c.cluster}
                </span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{c.summary}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => scrollTo("replay-tool")}
          className="px-6 py-3 bg-[#861F41] hover:bg-[#6B1A33] text-white font-semibold rounded-lg shadow transition-colors duration-200"
        >
          Try the Replay System ↓
        </button>
      </div>
    </section>
  );
}

function PublicationsSection() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(BIBTEX).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <section id="publications" className="py-16 px-6 bg-white">
      <div className="max-w-3xl mx-auto">
        <SectionLabel>Publications</SectionLabel>
        <SectionHeading>Publications & Citation</SectionHeading>

        {/* Publication card */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 mb-8">
          <div className="flex items-start gap-3 mb-3">
            <span className="shrink-0 mt-1 text-xs font-bold bg-[#861F41] text-white px-2 py-0.5 rounded">
              2025
            </span>
            <h3 className="text-base font-semibold text-gray-900 leading-snug">
              NIRVANA: A Dataset for Reproducing How Students Use Generative AI for Essay Writing
            </h3>
          </div>
          <div className="flex items-center gap-3 mb-4 pl-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://wordpress.cs.vt.edu/echolab/wp-content/uploads/sites/105/2018/09/cropped-cropped-cropped-EchoLab-LR-White-Background_Final.png"
              alt="EchoLab"
              className="h-6 w-auto object-contain"
            />
            <span className="text-gray-400">·</span>
            <span className="text-sm text-gray-500">Virginia Tech</span>
          </div>
          <div className="pl-8 flex gap-2">
            <a
              href="https://arxiv.org/abs/2604.07344"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1 rounded-full bg-[#861F41]/10 text-[#861F41] font-medium hover:bg-[#861F41]/20 transition-colors"
            >
              arXiv
            </a>
            <a
              href="https://arxiv.org/pdf/2604.07344"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1 rounded-full bg-[#861F41]/10 text-[#861F41] font-medium hover:bg-[#861F41]/20 transition-colors"
            >
              PDF
            </a>
          </div>
        </div>

        {/* BibTeX */}
        <h3 className="text-lg font-semibold text-gray-900 mb-3">BibTeX Citation</h3>
        <div className="relative bg-gray-900 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
            <span className="text-xs text-gray-400 font-mono">bibtex</span>
            <button
              onClick={handleCopy}
              className="text-xs text-gray-300 hover:text-white px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 transition-colors duration-150"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="p-5 text-sm text-green-300 font-mono overflow-x-auto whitespace-pre">
            {BIBTEX}
          </pre>
        </div>
      </div>
    </section>
  );
}

// ─── Full page wrapper ─────────────────────────────────────────────────────────

function AcademicPage() {
  return (
    <div>
      <PaperHero />
      <StickyNav />
      <AbstractSection />
      <DatasetSection />
      <FindingsSection />
      <MetricsSection />
      <WriterProfilesSection />
      <ReplaySystemSection />
      <PublicationsSection />

      {/* ── Replay Tool ── */}
      <section
        id="replay-tool"
        className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 border-t border-gray-200"
      >
        <div className="max-w-7xl mx-auto px-6 pt-12 pb-4 text-center">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#861F41] mb-3">
            Interactive Tool
          </span>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Replay a Session
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            Select any of the 77 participants and explore their writing process
            step by step.
          </p>
        </div>
        <Suspense fallback={<div className="p-12 text-center text-gray-400">Loading…</div>}>
          <LandingPage />
        </Suspense>
      </section>
    </div>
  );
}

export default function Home() {
  return <AcademicPage />;
}

// ─── Existing replay tool section (unchanged logic) ────────────────────────────

function LandingPage() {
  const [participants, setParticipants] = useState<ParticipantOption[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantOption | null>(null);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // If a study token is present, resolve it and redirect immediately to the replay
  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      const participant = TOKEN_MAP[token];
      if (participant) {
        router.replace(`/replay?participant=${participant}&locked=true`);
      }
    }
  }, []);

  useEffect(() => {
    setIsClient(true);

    // Load participant info from CSV
    const loadParticipantInfo = async () => {
      try {
        const response = await fetch("/data/part_info.csv");
        const csvText = await response.text();

        const result = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
        });

        // Create participants array with demographic info and metrics
        const participantOptions: ParticipantOption[] = Array.from({ length: 77 }, (_, i) => {
          const participantData: any = result.data.find((row: any) => parseInt(row.id) === i);

          if (participantData) {
            const userType = getWriterType(i + 1);
            return {
              value: `p${i + 1}`,
              label: `Participant ${i + 1} - ${userType} (${participantData.Gender?.toLowerCase()}, ${participantData.Age}, ${participantData.Race?.toLowerCase()})`,
              gender: participantData.Gender,
              age: participantData.Age,
              race: participantData.Race,
              po: parseFloat(participantData["Percieved Ownership"]) || 0,
              userWords: parseInt(participantData["User Final Words"]) || 0,
              gptWords: parseInt(participantData["GPT Final Words"]) || 0,
              totalWords: parseInt(participantData["Total Words"]) || 0,
              selfEfficacy: parseFloat(participantData["Self Efficacy Score"]) || 0,
              tamOverall: parseFloat(participantData["TAM Overall"]) || 0,
              csiTotal: parseFloat(participantData["CSI Total"]) || 0,
              gptInquiry: parseInt(participantData["GPT Inquiry"]) || 0,
              totalTime: parseFloat(participantData["Total Time"]) || 0,
              userPercent: parseFloat(participantData["User Final %"]) || 0,
            };
          }

          return {
            value: `p${i + 1}`,
            label: `Participant ${i + 1}`,
          };
        });

        setParticipants(participantOptions);
        setSelectedParticipant(null);
      } catch (error) {
        console.error("Error loading participant info:", error);
        // Fallback to basic participants without demographic info
        const basicParticipants = Array.from({ length: 77 }, (_, i) => ({
          value: `p${i + 1}`,
          label: `Participant ${i + 1}`,
        }));
        setParticipants(basicParticipants);
        setSelectedParticipant(null);
      }
    };

    loadParticipantInfo();
  }, []);

  const handleStart = () => {
    // Navigate to the replay page with the selected participant
    if (selectedParticipant) {
      router.push(`/replay?participant=${selectedParticipant.value}`);
    }
  };

  const handleRandomParticipant = () => {
    if (participants.length > 0) {
      const randomIndex = Math.floor(Math.random() * participants.length);
      setSelectedParticipant(participants[randomIndex]);
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      {/* Instructions Section */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Instructions
        </h2>
        <div className="text-gray-700 leading-relaxed space-y-4">
          <p>
            This tool allows you to replay essay writing sessions with
            ChatGPT. Select a participant from the dropdown below and click
            "Start Replay Session" to begin.
          </p>
          <p>
            Once you start a replay session, you'll see two main panels: the left panel displays the essay editor showing the participant's writing in real-time, and the right panel shows the conversation the participant had with ChatGPT. You can toggle the "Prompt" button on the left to view the prompt given to the participant. This prompt is the example ACT prompt.
          </p>
          <p>
            Below the participant selection, you can view various statistics referring to the participant and the essay writing session. The bar graphs show the user's Self Efficacy, Technology Acceptance Model, Percieved Ownership, and Creativity Support Index scores. The table shows the number of inquiries made, total words in the essay, the proportion of user written words, and the total time taken to write the essay. The statistics are also shown in the essay replay page with the button on the right.
          </p>
          <p>
            To start the replay, press the play button on the left side of the
            screen. You can pause, jump to the start and end of the essay, and set the playback speed through the
            session to analyze the interaction between the participant and ChatGPT.
          </p>
          <p>
            The timeline is annotated with the ChatGPT events, shown as small
            triangles on the timeline. Click to seek to these events
            directly. The orange triangles indicate a copy event, purple indicates paste events, and green indicates GPT Inquiries. Use the legend to review this information during the replay session.
          </p>
        </div>
      </div>

      {/* Selection and Start Section */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Get Started
        </h2>

        {/* Participant Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Participant
          </label>
          <div className="flex gap-2">
            {isClient ? (
              <>
                <div className="flex-1">
                  <Select
                    options={participants}
                    value={selectedParticipant}
                    onChange={(option) => option && setSelectedParticipant(option)}
                    isSearchable={true}
                    className="text-black"
                    styles={{
                      control: (provided) => ({
                        ...provided,
                        border: "1px solid #e5e7eb",
                        borderRadius: "0.5rem",
                        padding: "0.25rem",
                        boxShadow: "none",
                        "&:hover": {
                          border: "1px solid #861F41",
                        },
                      }),
                      menu: (provided) => ({
                        ...provided,
                        zIndex: 9999,
                      }),
                    }}
                  />
                </div>
                <button
                  onClick={handleRandomParticipant}
                  className="px-4 py-2 bg-[#E5751F]/10 hover:bg-[#E5751F]/20 text-[#7A3000] font-medium rounded-lg border border-[#E5751F]/40 transition-colors duration-200"
                  title="Select random participant"
                >
                  Random
                </button>
              </>
            ) : (
              <div className="border border-gray-300 rounded-lg p-3 bg-gray-50 flex-1">
                Loading...
              </div>
            )}
          </div>
        </div>

        {/* Participant Statistics */}
        {selectedParticipant && (
          <div className="mb-6">
            <ParticipantStatsPanel
              stats={{
                po: selectedParticipant.po || 0,
                userWords: selectedParticipant.userWords || 0,
                gptWords: selectedParticipant.gptWords || 0,
                totalWords: selectedParticipant.totalWords || 0,
                selfEfficacy: selectedParticipant.selfEfficacy || 0,
                tamOverall: selectedParticipant.tamOverall || 0,
                csiTotal: selectedParticipant.csiTotal || 0,
                gptInquiry: selectedParticipant.gptInquiry || 0,
                totalTime: selectedParticipant.totalTime || 0,
                userPercent: selectedParticipant.userPercent || 0,
              }}
            />
          </div>
        )}

        {/* Start Button */}
        <button
          onClick={handleStart}
          className="w-full bg-[#861F41] hover:bg-[#6B1A33] text-white font-semibold py-4 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
        >
          Start Replay Session
        </button>
      </div>
    </main>
  );
}
