"use client"
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Select from "react-select";

const participants = [
  { value: "p1", label: "Participant 1" },
  { value: "p2", label: "Participant 2" },
  { value: "p3", label: "Participant 3" },
];

export default function LandingPage() {
  const [selectedParticipant, setSelectedParticipant] = useState(participants[0]);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleStart = () => {
    // Navigate to the replay page with the selected participant
    router.push(`/replay?participant=${selectedParticipant.value}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-4xl font-bold text-gray-900 text-center">
            GPT Replay
          </h1>
          <p className="text-lg text-gray-600 mt-2 text-center">
            Interactive playback of essay writing sessions with ChatGPT
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Instructions Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            How to Use This System
          </h2>
          <div className="text-gray-700 leading-relaxed space-y-4">
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </p>
            <p>
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
            </p>
            <p>
              Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
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
            {isClient ? (
              <Select
                options={participants}
                value={selectedParticipant}
                onChange={(option) => option && setSelectedParticipant(option)}
                isSearchable={false}
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
                }}
              />
            ) : (
              <div className="border border-gray-300 rounded-lg p-3 bg-gray-50">
                Loading...
              </div>
            )}
          </div>

          {/* Start Button */}
          <button
            onClick={handleStart}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
          >
            Start Replay Session
          </button>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>
            This system allows you to replay and analyze essay writing sessions with ChatGPT
          </p>
        </div>
      </main>
    </div>
  );
}
