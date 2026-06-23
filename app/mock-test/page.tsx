// app/mock-test/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FlaskConical, Clock, BookOpen, ChevronRight,
  Loader2, AlertTriangle, CheckCircle2, Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";

const IOE_DISTRIBUTION = [
  { subject: "Mathematics", questions: 35, color: "bg-blue-100   text-blue-700   border-blue-200"   },
  { subject: "Physics",     questions: 27, color: "bg-purple-100 text-purple-700 border-purple-200" },
  { subject: "Chemistry",   questions: 22, color: "bg-green-100  text-green-700  border-green-200"  },
  { subject: "English",     questions: 16, color: "bg-amber-100  text-amber-700  border-amber-200"  },
];

const RULES = [
  "Total 100 questions in 120 minutes",
  "Each question carries 1 mark",
  "Negative marking of 0.05 per wrong answer",
  "Questions are randomly selected each attempt",
  "Timer continues even if you close the browser",
  "Test auto-submits when timer reaches zero",
];

export default function MockTestPage() {
  const router       = useRouter();
  const [loading, setLoading] = useState(false);
  const [agreed,  setAgreed]  = useState(false);
  const [activeFormat, setActiveFormat] = useState<any | null>(null);
  // Students no longer select marks/negative/duration — admin configures formats.

  async function handleStart() {
    if (!agreed) {
      toast({ title: "Please read and accept the instructions", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res  = await fetch("/api/tests/mock", { method: "POST" });
      const json = await res.json();

      if (!res.ok) {
        toast({ title: "Could not start test", description: json.error, variant: "destructive" });
        return;
      }

      toast({ title: "Mock test ready!", description: json.data.title, variant: "success" });
      router.push(`/exam/${json.data.testId}`);
    } catch {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  // Fetch active admin format to display
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/mock-format');
        if (!res.ok) return;
        const j = await res.json();
        setActiveFormat(j.data.format ?? null);
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  return (
    <div className="space-y-6 page-enter max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FlaskConical className="h-6 w-6 text-purple-600" />
          IOE Full Mock Test
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Simulate the real IOE entrance exam experience with the official question distribution.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        {/* Left: Distribution */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-600" />
                Question Distribution
              </CardTitle>
              <CardDescription>Official IOE entrance exam pattern</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {IOE_DISTRIBUTION.map(({ subject, questions, color }) => (
                <div key={subject} className={`flex items-center justify-between p-3 rounded-lg border ${color}`}>
                  <span className="text-sm font-medium">{subject}</span>
                  <Badge className={`${color} border font-semibold`}>
                    {questions} Qs
                  </Badge>
                </div>
              ))}
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-900 text-white">
                <span className="text-sm font-semibold">Total</span>
                <Badge className="bg-white text-gray-900 font-bold">100 Questions</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Timer info */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">120 Minutes</p>
                <p className="text-xs text-gray-500">2 hours exam duration</p>
                <p className="text-xs text-blue-600 mt-1">≈ 72 seconds per question</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Rules + Start */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-600" />
                Exam Instructions
              </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                  <ul className="space-y-2">
                    {RULES.map((rule, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        {rule}
                      </li>
                    ))}
                  </ul>

                  <div className="pt-2">
                    <p className="text-sm font-medium text-gray-800">Format is configured by admin.</p>
                    {activeFormat && (
                      <div className="mt-2 text-sm text-gray-600">
                        <p className="font-semibold">Active Format: {activeFormat.name}</p>
                        <p>Duration: {activeFormat.durationMinutes} minutes</p>
                        <p>Negative mark: {activeFormat.negativeMark}</p>
                      </div>
                    )}
                  </div>
                </div>
            </CardContent>
          </Card>

          {/* Warning */}
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Before you start</p>
                <p className="text-xs text-amber-700 mt-1">
                  Make sure you have a stable internet connection and a quiet environment.
                  The timer will NOT pause if you close the browser tab.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Agreement */}
          <label className="flex items-start gap-3 p-4 rounded-lg border-2 border-gray-200 bg-white cursor-pointer hover:border-blue-300 transition-colors">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              I have read the instructions and I am ready to start the exam.
            </span>
          </label>

          {/* Start button */}
          <Button
            size="lg"
            className="w-full gap-2 bg-purple-600 hover:bg-purple-700"
            onClick={handleStart}
            disabled={loading || !agreed}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating Test…
              </>
            ) : (
              <>
                <FlaskConical className="h-4 w-4" />
                Start IOE Mock Test
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>

          <p className="text-xs text-center text-gray-400">
            Questions are randomly selected fresh every attempt
          </p>
        </div>
      </div>
    </div>
  );
}
