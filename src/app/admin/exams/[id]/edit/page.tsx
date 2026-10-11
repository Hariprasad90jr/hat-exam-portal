import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ExamBuilderForm } from "@/components/ExamBuilderForm";

export default async function EditExamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: {
          options: {
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  if (!exam) {
    notFound();
  }

  const initialData = {
    id: exam.id,
    title: exam.title,
    code: exam.code,
    description: exam.description || "",
    instructions: exam.instructions || "",
    durationMinutes: exam.durationMinutes,
    passingScore: exam.passingScore,
    shuffleQuestions: exam.shuffleQuestions,
    shuffleOptions: exam.shuffleOptions,
    negativeMarking: exam.negativeMarking,
    negativeMarkPerQuestion: exam.negativeMarkPerQuestion,
    proctoringStrict: exam.proctoringStrict,
    status: exam.status,
    questions: exam.questions.map((q) => ({
      id: q.id,
      order: q.order,
      type: q.type,
      prompt: q.prompt,
      points: q.points,
      negativePoints: q.negativePoints,
      explanation: q.explanation || "",
      options: q.options.map((opt) => ({
        id: opt.id,
        text: opt.text,
        isCorrect: opt.isCorrect,
      })),
    })),
  };

  return <ExamBuilderForm initialData={initialData} />;
}
