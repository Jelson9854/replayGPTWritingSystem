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
  title     = {NIRVANA: A Comprehensive Dataset for Reproducing How Students Use Generative AI for Essay Writing},
  author    = {Jelson, Andrew and Manesh, Daniel and Lee, Sangwook and Jang, Alice and Dunlap, Daniel and Maddox, Tamara and Kim, Young-Ho and Lee, Sang Won},
  year      = {2025}
}`;

const AUTHORS = [
  { name: "Andrew Jelson",   affil: "Virginia Tech",           location: "Blacksburg, VA" },
  { name: "Daniel Manesh",   affil: "Virginia Tech",           location: "Blacksburg, VA" },
  { name: "Sangwook Lee",    affil: "Virginia Tech",           location: "Blacksburg, VA" },
  { name: "Alice Jang",      affil: "Virginia Tech",           location: "Blacksburg, VA" },
  { name: "Daniel Dunlap",   affil: "Virginia Tech",           location: "Blacksburg, VA" },
  { name: "Tamara Maddox",   affil: "George Mason University", location: "Fairfax, VA" },
  { name: "Young-Ho Kim",    affil: "NAVER AI Lab",            location: "Seongnam, South Korea" },
  { name: "Sang Won Lee",    affil: "Virginia Tech",           location: "Blacksburg, VA" },
];

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
    <span className="inline-block text-xs font-semibold tracking-widest uppercase text-indigo-500 mb-3">
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
      <span className="text-4xl font-extrabold text-indigo-600">{value}</span>
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
    <section className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-purple-900 text-white py-24 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight mb-4 tracking-tight">
          NIRVANA
        </h1>
        <p className="text-xl sm:text-2xl text-indigo-200 font-medium max-w-3xl mx-auto mb-6 leading-relaxed">
          A Comprehensive Dataset for Reproducing How Students Use Generative AI
          for Essay Writing
        </p>
        {/* Author grid */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 mb-10">
          {AUTHORS.map((a) => (
            <div key={a.name} className="text-center">
              <div className="text-white font-medium text-sm">
                {a.name}
              </div>
              <div className="text-indigo-300 text-xs">{a.affil}</div>
              <div className="text-indigo-400 text-xs">{a.location}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          <a
            href="https://arxiv.org/abs/2604.07344"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-indigo-700 border border-indigo-500 text-white font-semibold rounded-lg shadow hover:bg-indigo-600 transition-colors duration-200"
          >
            arXiv
          </a>
          <a
            href="https://arxiv.org/pdf/2604.07344"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-indigo-700 border border-indigo-500 text-white font-semibold rounded-lg shadow hover:bg-indigo-600 transition-colors duration-200"
          >
            Paper
          </a>
          <button
            onClick={() => scrollTo("bibtex")}
            className="px-6 py-3 bg-indigo-700 border border-indigo-500 text-white font-semibold rounded-lg shadow hover:bg-indigo-600 transition-colors duration-200"
          >
            Cite
          </button>
          <button
            onClick={() => scrollTo("replay-tool")}
            className="px-6 py-3 bg-indigo-700 border border-indigo-500 text-white font-semibold rounded-lg shadow hover:bg-indigo-600 transition-colors duration-200"
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
    { label: "Writer Profiles", id: "profiles" },
    { label: "Metrics", id: "metrics" },
    { label: "Replay System", id: "replay-system" },
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
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors duration-150"
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
                <span className="mt-0.5 text-indigo-500 shrink-0">✓</span>
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
              <div className="shrink-0 text-center bg-indigo-600 text-white rounded-xl px-5 py-4 sm:w-36">
                <div className="text-2xl font-extrabold">ρ = {c.rho}</div>
                <div className="text-xs text-indigo-200 mt-1">{c.p}</div>
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
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-indigo-900 mb-1">
              Human Contribution Ratio
            </h3>
            <span className="text-xs text-indigo-500 font-semibold tracking-wide uppercase">
              HCR
            </span>
            <div className="mt-4 mb-4 bg-white rounded-lg border border-indigo-100 px-4 py-3 font-mono text-sm text-gray-800">
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
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-purple-900 mb-1">
              Human Edit Ratio
            </h3>
            <span className="text-xs text-purple-500 font-semibold tracking-wide uppercase">
              HER
            </span>
            <div className="mt-4 mb-4 bg-white rounded-lg border border-purple-100 px-4 py-3 font-mono text-sm text-gray-800">
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
              <span className="font-mono font-bold text-indigo-700">
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
              <span className="mt-0.5 text-indigo-500 shrink-0">→</span>
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
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow transition-colors duration-200"
        >
          Try the Replay System ↓
        </button>
      </div>
    </section>
  );
}

function BibTeXSection() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(BIBTEX).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <section id="bibtex" className="py-16 px-6 bg-white">
      <div className="max-w-3xl mx-auto">
        <SectionLabel>Citation</SectionLabel>
        <SectionHeading>BibTeX</SectionHeading>
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
      <WriterProfilesSection />
      <MetricsSection />
      <ReplaySystemSection />
      <BibTeXSection />

      {/* ── Replay Tool ── */}
      <section
        id="replay-tool"
        className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 border-t border-gray-200"
      >
        <div className="max-w-7xl mx-auto px-6 pt-12 pb-4 text-center">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-indigo-500 mb-3">
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
            return {
              value: `p${i + 1}`,
              label: `Participant ${i + 1} (${participantData.Race}, ${participantData.Gender}, ${participantData.Age})`,
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
        setSelectedParticipant(participantOptions[0]);
      } catch (error) {
        console.error("Error loading participant info:", error);
        // Fallback to basic participants without demographic info
        const basicParticipants = Array.from({ length: 77 }, (_, i) => ({
          value: `p${i + 1}`,
          label: `Participant ${i + 1}`,
        }));
        setParticipants(basicParticipants);
        setSelectedParticipant(basicParticipants[0]);
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
                          border: "1px solid #6366f1",
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
                  className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 font-medium rounded-lg border border-purple-300 transition-colors duration-200"
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
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
        >
          Start Replay Session
        </button>
      </div>
    </main>
  );
}
