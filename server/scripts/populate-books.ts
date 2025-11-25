import { fetchBooksFromGutendex, processBook } from '../book-fetcher';
import { storage } from '../storage';

async function populateBooks() {
  console.log('📚 Starting book population from Gutendex API...\n');
  
  try {
    console.log('Fetching books from Gutendex...');
    const books = await fetchBooksFromGutendex(75);
    console.log(`✓ Found ${books.length} books\n`);
    
    let totalParagraphs = 0;
    let successfulBooks = 0;
    
    for (let i = 0; i < books.length; i++) {
      const book = books[i];
      try {
        console.log(`[${i + 1}/${books.length}] Processing: ${book.title}...`);
        const paragraphs = await processBook(book);
        
        if (paragraphs.length > 0) {
          await storage.insertBookParagraphs(paragraphs);
          totalParagraphs += paragraphs.length;
          successfulBooks++;
          console.log(`  ✓ Inserted ${paragraphs.length} paragraphs`);
        } else {
          console.log(`  ⚠ No paragraphs extracted`);
        }
      } catch (error) {
        console.error(`  ✗ Error processing book:`, error instanceof Error ? error.message : String(error));
        continue;
      }
    }
    
    console.log(`\n✅ Population complete!`);
    console.log(`   Books processed: ${successfulBooks}/${books.length}`);
    console.log(`   Total paragraphs: ${totalParagraphs}`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

populateBooks();
