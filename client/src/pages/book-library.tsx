import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { BookOpen, Loader2 } from "lucide-react";
import type { Book } from "@shared/schema";

export default function BookLibrary() {
  const [, setLocation] = useLocation();
  
  const { data: books = [], isLoading } = useQuery({
    queryKey: ['books'],
    queryFn: async () => {
      const res = await fetch('/api/books');
      if (!res.ok) throw new Error('Failed to fetch books');
      return res.json() as Promise<Book[]>;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <BookOpen className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">No Books Available</h2>
        <p className="text-muted-foreground">Books are being downloaded. Please wait...</p>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Book Library</h1>
        <p className="text-muted-foreground">Choose a book and start typing chapter by chapter</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {books.map((book) => (
          <Card
            key={book.id}
            className="group cursor-pointer hover:shadow-lg transition-all hover:scale-105"
            onClick={() => setLocation(`/books/${book.slug}`)}
            data-testid={`book-card-${book.id}`}
          >
            <div className="p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-primary/10">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate" data-testid={`book-title-${book.id}`}>
                    {book.title}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate" data-testid={`book-author-${book.id}`}>
                    {book.author}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{book.totalChapters} chapters</span>
                <span className="text-muted-foreground">{book.totalParagraphs} paragraphs</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  book.difficulty === 'easy' ? 'bg-green-500/20 text-green-500' :
                  book.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-500' :
                  'bg-red-500/20 text-red-500'
                }`} data-testid={`book-difficulty-${book.id}`}>
                  {book.difficulty}
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary" data-testid={`book-topic-${book.id}`}>
                  {book.topic}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
