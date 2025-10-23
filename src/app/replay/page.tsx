"use client"
import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Papa from "papaparse";
import { Message, CSVdata } from "@/components/types";
import Prompt from "@/components/prompt";
import GPT from "@/components/gpt";
import SliderComponent from "@/components/sliderComponent";
import { CodePlay } from "codemirror-record";
import dynamic from 'next/dynamic';
import type { ReplayHandle } from "@/components/replay";


const Replay = dynamic(() => import('@/components/replay'), {
  ssr: false,
  loading: () => <div>Loading Replay Editor...</div>,
});


async function loadCSV() {
  try {
    // Fetch the CSV file
    const response = await fetch("/data/replay_data.csv");
    const csvText = await response.text();
    
    // Parse CSV using Papaparse
    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });
    
    if (result.errors.length > 0) {
      console.warn("CSV parsing warnings:", result.errors);
    }
    
    console.log("Parsed CSV data:", result.data);
    console.log("Header:", result.meta.fields);
    return result.data;
  } catch (error) {
    console.error("Error loading CSV:", error);
    return null;
  }
}


export default function Home() {
  const searchParams = useSearchParams();
  const participantParam = searchParams.get('participant') || 'p1';
  // Convert p1, p2, p3 to essay_num 1, 2, 3
  const essayNum = parseInt(participantParam.replace('p', ''));

  const [messReplay, setMessReplay] = useState<Message[]>([]);
  const [isPromptVisible, setisPromptVisible] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0); // 0-100 percentage
  const [totalDuration, setTotalDuration] = useState(0); // in seconds
  const totalDurationRef = useRef(0); // Ref for immediate access in RAF loop
  const speed = useRef(1.0);
  const playing = useRef(false);
  const playCodeMirrorRef = useRef<ReplayHandle>(null);
  const codePlayerRef = useRef<CodePlay | null>(null);
  const [recording, setRecording] = useState<string>("");
  const allMessagesRef = useRef<Message[]>([]); // Store all messages for seek functionality
  const messagePlaybackActive = useRef(false); // Track if message playback loop is running

  const startProgressTracking = () => {
    const updateProgress = () => {
      if (codePlayerRef.current && totalDurationRef.current > 0) {
        const currentTimeMs = codePlayerRef.current.getCurrentTime();
        const currentTimeSec = currentTimeMs / 1000;
        const progress = (currentTimeSec / totalDurationRef.current) * 100;

        // Use functional update to avoid stale closure issues
        setCurrentProgress(prev => {
          const newProgress = Math.min(progress, 100);
          if (Math.abs(newProgress - prev) > 0.01) { // Only update if changed by more than 0.01%
            return newProgress;
          }
          return prev;
        });
      }
      requestAnimationFrame(updateProgress);
    };
    requestAnimationFrame(updateProgress);
  };

const handleLoadArrays = async (): Promise<void> => {
  const allData = (await loadCSV()) as CSVdata;
  if (allData) {
    // Filter data by essay_num matching selected participant
    const data = allData.filter((row: any) => row.essay_num === essayNum);

    if (data.length === 0) {
      console.error(`No data found for participant ${participantParam} (essay_num: ${essayNum})`);
      return;
    }

    console.log(`Loaded ${data.length} rows for participant ${participantParam} (essay_num: ${essayNum})`);

    // Set initial editor state from first row
    if (data[0] && data[0].current_editor) {
      try {
        // Convert single quotes to double quotes for valid JSON
        let editorState = data[0].current_editor;
        editorState = editorState.replace(/'/g, '"');

        const initialLines = JSON.parse(editorState);
        const initialState = ('\n\n\n\n');
        const editor = playCodeMirrorRef.current?.getEditor();
        if (editor) {
          editor.setValue(initialState);
        }
      } catch (e) {
        console.error("Failed to parse initial editor state:", e);
        console.error("Raw value:", data[0].current_editor);
      }
    }

    const newRecordings: string[] = [];
    const newMessages: Message[] = [];
    let messageIndex = 0;

    for(const element of data) {
      switch(element.op_loc) {
        case "editor":
          let record = element.recording_obj;

          // Skip if recording_obj is null or undefined
          if (!record) {
            console.warn("Skipping null recording_obj for element");
            break;
          }

          // Convert single quotes to double quotes for valid JSON
          // First, escape any double quotes that appear inside string values
          record = record.replace(/: '([\s\S]*?)'/g, (match, content) => {
            // Don't escape if this is an array starter
            if (match === ": '[") return match;
            // Escape double quotes in the content (but preserve existing backslash escapes like \n)
            const escaped = content.replace(/"/g, '\\"');
            return `: '${escaped}'`;
          });

          // Now replace structural single quotes with double quotes
          record = record.replace(/\{'/g, '{"');
          record = record.replace(/':/g, '":');
          record = record.replace(/, '/g, ', "');
          record = record.replace(/\['/g, '["');
          record = record.replace(/'(\})/g, '"$1');
          record = record.replace(/'(\])/g, '"$1');
          record = record.replace(/'(,)/g, '"$1');
          record = record.replace(/: '/g, ': "');

          newRecordings.push(record);
          break;
        case "gpt":
            if(element.op_type === "gpt_inquiry" || element.op_type === "gpt_response"){
              const newMessage: Message = {
              id: messageIndex,
              role: element.op_type === "gpt_inquiry" ? "user" : "assistant",
              content: element.selected_text || "",
              time: element.time,
            };
            messageIndex += 1;
            newMessages.push(newMessage);
            console.log(`Message ${messageIndex}: time=${element.time}, content=${element.selected_text?.substring(0, 50)}...`);
          }
          break;
      }

    }

    // Log total messages found
    console.log("Total messages found:", newMessages.length);

    // Store all messages for seek functionality
    allMessagesRef.current = newMessages;

    // Combine all recording objects into one JSON array string
    const combinedRecording = "[" + newRecordings.join(", ") + "]";
    setRecording(combinedRecording);

    // Validate JSON before passing to CodePlay
    try {
      JSON.parse(combinedRecording);
    } catch (e) {
      console.error("Invalid JSON generated:", e);
      return;
    }

    // Initialize CodePlay with operations
    const codePlayer = new CodePlay(playCodeMirrorRef.current?.getEditor()!, {
      autoplay: false,
      speed: speed.current
      // No maxDelay - preserve original pauses during playback
    });
    codePlayerRef.current = codePlayer;
    codePlayer.addOperations(combinedRecording);

    // Get total duration from CodePlay (returns milliseconds)
    const durationMs = codePlayer.getDuration();
    const duration = durationMs / 1000; // Convert to seconds
    totalDurationRef.current = duration; // Set ref immediately for RAF loop
    setTotalDuration(duration); // Set state for UI display
    console.log("Total duration:", duration, "seconds (", durationMs, "ms)");

    // Start message playback with the collected messages
    playMessages(newMessages);

    // Start progress tracking
    startProgressTracking();
  }
};

const playMessages = (messagesToPlay: Message[]): void => {
  if (messagesToPlay.length === 0) {
    console.log("No messages to play");
    return;
  }

  console.log("Starting message playback with", messagesToPlay.length, "messages");

  // Mark as active
  messagePlaybackActive.current = true;

  // Continuously sync messages with current playback time
  const syncMessages = () => {
    if (!messagePlaybackActive.current) return;

    if (codePlayerRef.current) {
      // Get current time from CodePlay
      const currentTimeMs = codePlayerRef.current.getCurrentTime() || 0;
      const currentTimeSec = currentTimeMs / 1000;

      // Find ALL messages that should be visible at current time
      const messagesToShow = allMessagesRef.current.filter(msg => msg.time <= currentTimeSec);

      // Update messages (React will only re-render if the array length changed)
      setMessReplay(prev => {
        if (prev.length !== messagesToShow.length) {
          return messagesToShow;
        }
        return prev;
      });
    }

    // Continue looping
    requestAnimationFrame(syncMessages);
  };

  // Start the sync loop
  requestAnimationFrame(syncMessages);
};

  const handleSpeedChange = (newSpeed) => {
    console.log("Speed changed to:", newSpeed);
    speed.current = newSpeed;

    // Update CodePlay speed if it exists
    if (codePlayerRef.current) {
      codePlayerRef.current.setSpeed(newSpeed);
    }

  };

  const handlePlayChange = (isPlaying) => {
    console.log("Play state changed to:", isPlaying);
    playing.current = isPlaying;

    // Control CodePlay playback if it exists
    if (codePlayerRef.current) {
      if (isPlaying) {
        codePlayerRef.current.play();
      } else {
        codePlayerRef.current.pause();
      }
    }
  };

  const handleSeek = (percentage: number) => {
    console.log("Seeking to:", percentage.toFixed(3), "%");

    if (!codePlayerRef.current || totalDuration === 0) return;

    const codePlayer = codePlayerRef.current;

    // Calculate target time in seconds
    const targetTimeSec = (percentage / 100) * totalDuration;
    const targetTimeMs = targetTimeSec * 1000;

    console.log("Target time:", targetTimeSec.toFixed(2), "seconds");

    // Save current playback state
    const wasPlaying = codePlayer.getStatus() === 'PLAY';

    // Use built-in seek() which internally uses speed=0 (fastest possible)
    // This processes operations with 0ms setTimeout delay (as fast as JS event loop allows)
    codePlayer.seek(targetTimeMs);

    // Poll to detect when seeking is complete
    const checkSeekComplete = () => {
      const currentTime = codePlayer.getCurrentTime();
      const timeDiff = Math.abs(currentTime - targetTimeMs);

      // If we're within 50ms of target or paused, seek is complete
      if (timeDiff < 50 || codePlayer.getStatus() === 'PAUSE') {
        // Restore original playing state
        if (wasPlaying) {
          codePlayer.play();
        }

        console.log("Seek complete, playing:", wasPlaying);
      } else {
        // Keep checking every 5ms
        setTimeout(checkSeekComplete, 5);
      }
    };

    // Start checking
    setTimeout(checkSeekComplete, 5);

    // Update progress immediately
    setCurrentProgress(percentage);

    console.log(`Seeking to ${targetTimeSec.toFixed(2)}s`);
  };

useEffect(() => {
  let attempts = 0;
  const maxAttempts = 20;
  
  const checkEditor = setInterval(() => {
    const editor = playCodeMirrorRef.current?.getEditor();
    attempts++;
    
    if (editor) {
      console.log(`Editor ready, loading participant ${participantParam}`);
      clearInterval(checkEditor);

      // Load data and set initial editor state
      handleLoadArrays();
    } else if (attempts >= maxAttempts) {
      console.error("Editor failed to initialize after", maxAttempts, "attempts");
      clearInterval(checkEditor);
    }
  }, 200);

  return () => clearInterval(checkEditor);
}, []);


  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <>
    {/* Header */}
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">
          Essay Writing Replay - {participantParam === 'p1' ? 'Participant 1' : participantParam === 'p2' ? 'Participant 2' : 'Participant 3'}
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Interactive playback of essay writing sessions with ChatGPT
        </p>
      </div>
    </header>

    <main className="px-6 py-5 flex h-[calc(100vh-9rem)]">
  {/* Sliding Prompt Panel */}
  <div className={`transition-all duration-300 flex-shrink-0 ${
    isPromptVisible ? 'w-[25%]' : 'w-0'
  }`}>
    <div className={`h-full flex items-start overflow-hidden ${
      isPromptVisible ? 'opacity-100' : 'opacity-0'
    } transition-opacity duration-300`}>
      <div className="ml-4 border rounded-xl border-gray-200 bg-white p-4 w-full h-full flex flex-col overflow-auto shadow-lg">
        <Prompt />
      </div>
    </div>
  </div>

  {/* Toggle button */}
  <button
    onClick={() => setisPromptVisible(!isPromptVisible)}
    className={`bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 h-10 flex items-center justify-center shadow-lg hover:shadow-xl transition-all z-50 self-start flex-shrink-0 ${
      isPromptVisible ? 'mx-2' : 'mr-2'
    }`}
  >
    <span className="text-sm font-medium">{isPromptVisible ? '← Hide' : 'Prompt →'}</span>
  </button>

  {/* Main content area */}
<div className="flex-1 flex flex-col">
  <div id="frames" className={`flex justify-center h-full gap-4 transition-all duration-300 ${
    isPromptVisible ? 'w-full' : 'w-full'
  }`}>
    <div className={`border rounded-xl shadow-xl border-gray-200 p-5 transition-all duration-300 bg-white ${
      isPromptVisible ? 'w-[55%]' : 'w-1/2'
    } flex flex-col`}>
      <Replay ref={playCodeMirrorRef} />
    </div>
    <div className={`border rounded-xl shadow-xl border-gray-200 p-5 bg-white ${
      isPromptVisible ? 'w-[45%]' : 'w-1/2'
    } flex flex-col`}>
      <GPT messages={messReplay}/>
    </div>
  </div>
</div>
</main>

  {/* Controls footer */}
  <div className="flex w-full justify-center fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg py-3 px-6">
    <div className="w-full">
      <SliderComponent
        onSpeedChange={handleSpeedChange}
        onPlayChange={handlePlayChange}
        onSeek={handleSeek}
        currentProgress={currentProgress}
        totalDuration={totalDuration}
        messageTimestamps={allMessagesRef.current.map(msg => msg.time)}
      />
    </div>
  </div>
  </>
  );
}

// const handleLoadArrays = async (): Promise<void> => {
//   const data = (await loadCSV()) as csv_data;
//   if (data) {
//     let waitTime = Number(data[0][3]) / speed.current;
//     console.log(data[0]);
//     for (const element of data) {
//       while (!playing.current) {
//         const paused = sleep(0.01);
//         sleepRef.current = paused;
//         try {
//           await paused.promise;
//         } catch (e) {
          
//         }
//         console.log("Paused, waiting to resume...");
//       }
      
      
//       let waiting = false;
//       while (!waiting) {
//         let tempTime = ((Number(element[3])) / Number(speed.current));
//         let calcTime = tempTime - waitTime;
//         waitTime = tempTime;
//         console.log("Waiting", calcTime,"seconds");

//         const action = sleep(calcTime);
//         sleepRef.current = action;
//         try {
//           await action.promise;
//           waiting = true;
//         } catch (e) {
//           console.log("Wait cancelled, recalculating wait time...");

//           // If paused, wait until resumed before retrying
//           while (!playing.current) {
//             const pauseSleep = sleep(0.01);
//             sleepRef.current = pauseSleep;
//             try {
//               await pauseSleep.promise;
//             } catch (e) {
//               // Pause sleep cancelled, continue checking
//             }
//             console.log("Paused, waiting to resume...");
//               }
//             }
//       // console.log("Processing element:", element);
      
//       switch (element[4]) {
//         case "gpt":
//           if(element[5] === "gpt_inquiry" || element[5] === "gpt_response"){
//             const newMessage: Message = {
//             id: mess_index,
//             role: element[5] === "gpt_inquiry" ? "user" : "assistant",
//             content: element[9],
//           };
//           mess_index += 1;

//           setMessages((prevMessages) => [...prevMessages, newMessage]);
//           break;
//           }
//      case "editor":
//   const playCodeMirror = playCodeMirrorRef.current?.getEditor();
//   if(!playCodeMirror) {
//     console.error("No CodeMirror instance");
//     return;
//   }
  
//   console.log("Raw element[11]:", element[11]);
  
//   // Smart approach: Only replace single quotes that are structural (keys, brackets)
//   // not the ones inside string values
//   let record = element[11];
  
//   // Replace single quotes around keys: {'key' -> {"key"
//   record = record.replace(/\{'/g, '{"');
//   record = record.replace(/':/g, '":');
//   record = record.replace(/, '/g, ', "');
//   record = record.replace(/\['/g, '["');
  
//   // Replace single quotes around values that are followed by }, ], or ,
//   record = record.replace(/'(\})/g, '"$1');
//   record = record.replace(/'(\])/g, '"$1');
//   record = record.replace(/'(,)/g, '"$1');
  
//   // Replace opening quotes for string values after :
//   record = record.replace(/: '/g, ': "');
  
//   // Wrap in array brackets
//   record = "[" + record + "]";
  
//   console.log("Constructed record:", record);

//   try {
//     const parsedOps = JSON.parse(record);
//     console.log("Original operations:", parsedOps);
    
//     const adjustedOps = parsedOps.map(op => {
//       let newT;
//       if (Array.isArray(op.t)) {
//         newT = [0, 100];
//       } else {
//         newT = 0;
//       }
      
//       return {
//         ...op,
//         t: newT
//       };
//     });
    
//     const adjustedRecord = JSON.stringify(adjustedOps);
    
//     const codePlayer = new CodePlay(playCodeMirror, { 
//       autoplay: true,
//       minDelay: 0
//     });
    
//     codePlayer.addOperations(adjustedRecord);
//     console.log("Operations added");
    
//   } catch (e) {
//     console.error("CodePlay failed:", e);
//     console.error("Failed record:", record);
//   }
//   break;
//         }
//       }
//     }
//   }};