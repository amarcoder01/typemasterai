import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Loader2, ArrowLeft, FileText } from "lucide-react";
import type { Book } from "@shared/schema";

interface Chapter {
  chapter: number;
  title: string | null;
  paragraphCount: number;
}

export default function BookDetail() {
  const [, params] = useRoute("/books/:slug");
  const [, setLocation] = useLocation();
  const slug = params?.slug || '';

  const { data: book, isLoading: bookLoading } = useQuery({
    queryKey: ['book', slug],
    queryFn: async () => {
      const res = await fetch(`/api/books/${slug}`);
      if (!res.ok) throw new Error('Failed to fetch book');
      return res.json() as Promise<Book>;
    },
    enabled: !!slug,
  });

  const { data: chapters = [], isLoading: chaptersLoading } = useQuery({
    queryKey: ['chapters', book?.id],
    queryFn: async () => {
      const res = await fetch(`/api/books/${book!.id}/chapters`);
      if (!res.ok) throw new Error('Failed to fetch chapters');
      return res.json() as Promise<Chapter[]>;
    },
    enabled: !!book,
  });

  if (bookLoading || chaptersLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <BookOpen className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">Book Not Found</h2>
        <Button onClick={() => setLocation('/books')}>Back to Library</Button>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => setLocation('/books')}
        className="mb-6"
        data-testid="back-to-library"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Library
      </Button>

      <div className="mb-8">
        <div className="flex items-start gap-4 mb-4">
          <div className="p-4 rounded-lg bg-primary/10">
            <BookOpen className="w-12 h-12 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2" data-testid="book-title">{book.title}</h1>
            <p className="text-xl text-muted-foreground mb-4" data-testid="book-author">by {book.author}</p>
            <div className="flex items-center gap-3">
              <span className={`text-sm px-3 py-1 rounded-full ${
                book.difficulty === 'easy' ? 'bg-green-500/20 text-green-500' :
                book.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-500' :
                'bg-red-500/20 text-red-500'
              }`} data-testid="book-difficulty">
                {book.difficulty}
              </span>
              <span className="text-sm px-3 py-1 rounded-full bg-primary/20 text-primary" data-testid="book-topic">
                {book.topic}
              </span>
              <span className="text-sm text-muted-foreground">{book.totalChapters} chapters</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Chapters</h2>
        <div className="space-y-3">
          {chapters.map((chapter) => (
            <Card
              key={`chapter-${book.id}-${chapter.chapter}`}
              className="group cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]"
              onClick={() => setLocation(`/books/${slug}/chapter/${chapter.chapter}`)}
              data-testid={`chapter-card-${chapter.chapter}`}
            >
              <div className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold" data-testid={`chapter-title-${chapter.chapter}`}>
                    Chapter {chapter.chapter}
                    {chapter.title && `: ${chapter.title}`}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {chapter.paragraphCount} paragraph{chapter.paragraphCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  data-testid={`start-chapter-${chapter.chapter}`}
                >
                  Start Typing
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
