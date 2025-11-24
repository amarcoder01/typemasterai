import { db } from "./storage";
import { typingParagraphs } from "@shared/schema";

const paragraphsData = [
  // ENGLISH - General
  {
    language: "en",
    mode: "general",
    difficulty: "easy",
    content: "The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet and is perfect for practicing typing. Regular practice helps improve both speed and accuracy over time.",
    wordCount: 33,
  },
  {
    language: "en",
    mode: "general",
    difficulty: "medium",
    content: "Technology has revolutionized the way we communicate and work. From smartphones to cloud computing, digital tools have become essential in our daily lives. Learning to type efficiently is now more important than ever before.",
    wordCount: 37,
  },
  {
    language: "en",
    mode: "general",
    difficulty: "hard",
    content: "Globalization has interconnected economies, cultures, and societies across the world. International trade agreements, technological advancements, and improved transportation systems have facilitated unprecedented levels of cross-border cooperation. However, this interconnectedness also presents challenges related to economic inequality, cultural homogenization, and environmental sustainability that require collaborative solutions.",
    wordCount: 48,
  },

  // ENGLISH - Entertainment
  {
    language: "en",
    mode: "entertainment",
    difficulty: "easy",
    content: "Movies transport us to different worlds and tell amazing stories. From action-packed adventures to heartwarming dramas, cinema offers something for everyone. Popcorn and good company make the experience even better.",
    wordCount: 33,
  },
  {
    language: "en",
    mode: "entertainment",
    difficulty: "medium",
    content: "Gaming has evolved from simple pixelated graphics to photorealistic virtual worlds. Modern video games feature complex narratives, stunning visuals, and immersive gameplay that rival blockbuster movies. Esports competitions now fill stadiums with passionate fans watching professional gamers compete.",
    wordCount: 41,
  },
  {
    language: "en",
    mode: "entertainment",
    difficulty: "hard",
    content: "Streaming platforms have fundamentally transformed how we consume entertainment content. Netflix, Disney Plus, and Amazon Prime offer vast libraries of movies and shows available on demand. Binge-watching entire seasons has become a cultural phenomenon, and original streaming content now competes with traditional Hollywood productions for prestigious awards. The convenience of watching anything, anywhere, has made traditional cable television increasingly obsolete.",
    wordCount: 63,
  },

  // ENGLISH - Technical
  {
    language: "en",
    mode: "technical",
    difficulty: "easy",
    content: "HTML and CSS are the building blocks of web development. HTML structures content while CSS styles it. Learning these technologies opens doors to creating beautiful websites and applications.",
    wordCount: 29,
  },
  {
    language: "en",
    mode: "technical",
    difficulty: "medium",
    content: "JavaScript is a versatile programming language used for both frontend and backend development. Modern frameworks like React and Vue make building interactive user interfaces efficient and enjoyable. Node.js enables developers to use JavaScript on the server side as well.",
    wordCount: 43,
  },
  {
    language: "en",
    mode: "technical",
    difficulty: "hard",
    content: "Microservices architecture decomposes applications into small, independent services that communicate through APIs. Each microservice handles a specific business capability and can be developed, deployed, and scaled independently. This approach offers flexibility and resilience but introduces complexity in managing distributed systems, requiring robust orchestration tools like Kubernetes and service mesh implementations.",
    wordCount: 55,
  },

  // ENGLISH - Programming
  {
    language: "en",
    mode: "programming",
    difficulty: "easy",
    content: "function greet(name) { return 'Hello, ' + name + '!'; } const message = greet('World'); console.log(message);",
    wordCount: 16,
  },
  {
    language: "en",
    mode: "programming",
    difficulty: "medium",
    content: "const fetchData = async (url) => { try { const response = await fetch(url); const data = await response.json(); return data; } catch (error) { console.error('Error:', error); throw error; } };",
    wordCount: 32,
  },
  {
    language: "en",
    mode: "programming",
    difficulty: "hard",
    content: "class BinarySearchTree { constructor() { this.root = null; } insert(value) { const newNode = { value, left: null, right: null }; if (!this.root) { this.root = newNode; return; } let current = this.root; while (true) { if (value < current.value) { if (!current.left) { current.left = newNode; break; } current = current.left; } else { if (!current.right) { current.right = newNode; break; } current = current.right; } } } }",
    wordCount: 78,
  },

  // ENGLISH - Quotes
  {
    language: "en",
    mode: "quotes",
    difficulty: "medium",
    content: "The only way to do great work is to love what you do. If you haven't found it yet, keep looking. Don't settle. As with all matters of the heart, you'll know when you find it. - Steve Jobs",
    wordCount: 42,
  },
  {
    language: "en",
    mode: "quotes",
    difficulty: "medium",
    content: "In the end, we will remember not the words of our enemies, but the silence of our friends. Injustice anywhere is a threat to justice everywhere. We are caught in an inescapable network of mutuality. - Martin Luther King Jr.",
    wordCount: 42,
  },

  // SPANISH - General
  {
    language: "es",
    mode: "general",
    difficulty: "easy",
    content: "El sol brilla en el cielo azul. Los pájaros cantan en los árboles. Es un día perfecto para salir a caminar por el parque y disfrutar de la naturaleza.",
    wordCount: 31,
  },
  {
    language: "es",
    mode: "general",
    difficulty: "medium",
    content: "La tecnología ha cambiado nuestra forma de vivir y trabajar. Las computadoras y teléfonos inteligentes nos permiten conectarnos con personas de todo el mundo instantáneamente. El futuro promete aún más innovaciones emocionantes.",
    wordCount: 35,
  },
  {
    language: "es",
    mode: "general",
    difficulty: "hard",
    content: "La educación es fundamental para el desarrollo de cualquier sociedad. A través del conocimiento y la formación continua, las personas pueden alcanzar sus metas y contribuir positivamente a sus comunidades. Invertir en educación de calidad es invertir en un futuro mejor para todos.",
    wordCount: 45,
  },

  // SPANISH - Entertainment
  {
    language: "es",
    mode: "entertainment",
    difficulty: "medium",
    content: "El cine latinoamericano ha ganado reconocimiento mundial con películas galardonadas. Directores talentosos cuentan historias únicas que reflejan la cultura y las experiencias de la región. Los festivales internacionales celebran estas producciones cinematográficas.",
    wordCount: 34,
  },
  
  // SPANISH - Technical
  {
    language: "es",
    mode: "technical",
    difficulty: "medium",
    content: "La inteligencia artificial está transformando la industria tecnológica. Los algoritmos de aprendizaje automático procesan grandes cantidades de datos para identificar patrones y hacer predicciones precisas. Las aplicaciones van desde reconocimiento de voz hasta vehículos autónomos.",
    wordCount: 38,
  },
  
  // SPANISH - Programming
  {
    language: "es",
    mode: "programming",
    difficulty: "medium",
    content: "function calcular(a, b) { const suma = a + b; const producto = a * b; return { suma, producto }; } const resultado = calcular(5, 3); console.log(resultado);",
    wordCount: 28,
  },

  // SPANISH - Quotes
  {
    language: "es",
    mode: "quotes",
    difficulty: "medium",
    content: "La imaginación es más importante que el conocimiento. El conocimiento es limitado, mientras que la imaginación no tiene límites. - Albert Einstein",
    wordCount: 24,
  },

  // FRENCH - Technical
  {
    language: "fr",
    mode: "technical",
    difficulty: "medium",
    content: "L'informatique quantique promet de révolutionner le calcul. Les ordinateurs quantiques utilisent les principes de la mécanique quantique pour traiter l'information de manière radicalement différente. Cette technologie pourrait résoudre des problèmes actuellement impossibles.",
    wordCount: 35,
  },

  // FRENCH - Entertainment
  {
    language: "fr",
    mode: "entertainment",
    difficulty: "medium",
    content: "Le cinéma français a une longue tradition d'excellence artistique. Des réalisateurs innovants créent des films qui explorent la condition humaine avec profondeur et sensibilité. Les festivals de Cannes attirent l'attention mondiale.",
    wordCount: 33,
  },

  // GERMAN - Technical
  {
    language: "de",
    mode: "technical",
    difficulty: "medium",
    content: "Die Digitalisierung verändert alle Bereiche unseres Lebens. Künstliche Intelligenz und maschinelles Lernen ermöglichen neue Anwendungen. Cloud Computing bietet flexible und skalierbare Infrastruktur für moderne Unternehmen.",
    wordCount: 28,
  },

  // GERMAN - Entertainment
  {
    language: "de",
    mode: "entertainment",
    difficulty: "medium",
    content: "Die deutsche Filmindustrie produziert vielfältige Werke. Von historischen Dramen bis zu modernen Komödien bietet das deutsche Kino für jeden Geschmack etwas. Internationale Filmfestivals präsentieren diese Produktionen.",
    wordCount: 29,
  },

  // ITALIAN - Technical
  {
    language: "it",
    mode: "technical",
    difficulty: "medium",
    content: "La tecnologia blockchain sta rivoluzionando molti settori. Questa tecnologia distribuita garantisce trasparenza e sicurezza nelle transazioni digitali. Le criptovalute sono solo una delle tante applicazioni possibili di questa innovazione.",
    wordCount: 31,
  },

  // ITALIAN - Entertainment
  {
    language: "it",
    mode: "entertainment",
    difficulty: "medium",
    content: "Il cinema italiano è famoso in tutto il mondo per la sua creatività. Registi leggendari hanno creato capolavori che continuano a ispirare nuove generazioni. I festival cinematografici celebrano questa ricca tradizione artistica.",
    wordCount: 33,
  },

  // PORTUGUESE - Technical
  {
    language: "pt",
    mode: "technical",
    difficulty: "medium",
    content: "A computação em nuvem transformou a forma como armazenamos e processamos dados. Empresas podem escalar recursos conforme necessário sem investir em infraestrutura física. A segurança e a disponibilidade são prioridades neste modelo.",
    wordCount: 32,
  },

  // PORTUGUESE - Entertainment
  {
    language: "pt",
    mode: "entertainment",
    difficulty: "medium",
    content: "A música brasileira é conhecida mundialmente pela sua diversidade e ritmo. Do samba à bossa nova, cada estilo conta uma história única. Festivais de música celebram essa riqueza cultural com artistas de todo o país.",
    wordCount: 37,
  },

  // JAPANESE - Technical
  {
    language: "ja",
    mode: "technical",
    difficulty: "medium",
    content: "人工知能技術は急速に進化しています。機械学習アルゴリズムは大量のデータを分析し、パターンを識別します。この技術は医療、金融、製造業など多くの分野で活用されています。",
    wordCount: 52,
  },

  // CHINESE - Technical
  {
    language: "zh",
    mode: "technical",
    difficulty: "medium",
    content: "云计算技术改变了企业的运营方式。通过互联网访问计算资源，公司可以快速扩展业务。数据安全和隐私保护是云服务的重要考虑因素。",
    wordCount: 42,
  },

  // More English modes coverage
  {
    language: "en",
    mode: "quotes",
    difficulty: "medium",
    content: "Success is not final, failure is not fatal: it is the courage to continue that counts. We make a living by what we get, but we make a life by what we give. - Winston Churchill",
    wordCount: 38,
  },

  // FRENCH - General
  {
    language: "fr",
    mode: "general",
    difficulty: "easy",
    content: "Bonjour! Comment allez-vous aujourd'hui? Le temps est magnifique et le ciel est bleu. C'est une belle journée pour se promener dans le parc.",
    wordCount: 25,
  },
  {
    language: "fr",
    mode: "general",
    difficulty: "medium",
    content: "La France est célèbre pour sa cuisine, son art et son histoire. Paris, la capitale, attire des millions de visiteurs chaque année. La Tour Eiffel et le Louvre sont parmi les sites les plus visités au monde.",
    wordCount: 40,
  },

  // GERMAN - General
  {
    language: "de",
    mode: "general",
    difficulty: "easy",
    content: "Guten Tag! Wie geht es Ihnen? Das Wetter ist heute sehr schön. Die Sonne scheint und der Himmel ist blau.",
    wordCount: 21,
  },
  {
    language: "de",
    mode: "general",
    difficulty: "medium",
    content: "Deutschland ist bekannt für seine Ingenieurskunst und Präzision. Die Automobilindustrie spielt eine wichtige Rolle in der deutschen Wirtschaft. Marken wie BMW, Mercedes und Volkswagen sind weltweit anerkannt.",
    wordCount: 29,
  },

  // ITALIAN - General
  {
    language: "it",
    mode: "general",
    difficulty: "easy",
    content: "Ciao! Come stai oggi? L'Italia è un paese bellissimo con una storia ricca. La cucina italiana è amata in tutto il mondo.",
    wordCount: 23,
  },
  {
    language: "it",
    mode: "general",
    difficulty: "medium",
    content: "Roma, la capitale d'Italia, è conosciuta come la Città Eterna. Il Colosseo, il Pantheon e la Fontana di Trevi sono solo alcune delle meraviglie che si possono ammirare visitando questa magnifica città.",
    wordCount: 35,
  },

  // PORTUGUESE - General
  {
    language: "pt",
    mode: "general",
    difficulty: "easy",
    content: "Olá! Como você está? O Brasil é um país grande e diverso. As praias são lindas e o povo é muito amigável.",
    wordCount: 24,
  },
  {
    language: "pt",
    mode: "general",
    difficulty: "medium",
    content: "A língua portuguesa é falada em vários países ao redor do mundo. Brasil, Portugal, Angola e Moçambique são apenas alguns exemplos. A cultura lusófona é rica em tradições, música e literatura.",
    wordCount: 34,
  },

  // JAPANESE - General  
  {
    language: "ja",
    mode: "general",
    difficulty: "easy",
    content: "こんにちは。今日はいい天気ですね。日本は美しい国です。桜の花がとても綺麗です。",
    wordCount: 28,
  },
  {
    language: "ja",
    mode: "general",
    difficulty: "medium",
    content: "日本の技術は世界中で有名です。ロボット工学と電子機器の分野でリーダーです。東京は近代的な都市で、伝統と革新が共存しています。",
    wordCount: 36,
  },

  // CHINESE - General
  {
    language: "zh",
    mode: "general",
    difficulty: "easy",
    content: "你好！今天天气很好。中国是一个历史悠久的国家。长城是世界七大奇迹之一。",
    wordCount: 26,
  },
  {
    language: "zh",
    mode: "general",
    difficulty: "medium",
    content: "中国的科技发展非常迅速。人工智能和电子商务领域取得了重大进展。许多创新公司正在改变我们的生活方式。",
    wordCount: 32,
  },

  // HINDI - General
  {
    language: "hi",
    mode: "general",
    difficulty: "easy",
    content: "नमस्ते! आज मौसम बहुत अच्छा है। भारत एक विविध और सुंदर देश है। यहाँ कई भाषाएँ और संस्कृतियाँ हैं।",
    wordCount: 22,
  },

  // RUSSIAN - General
  {
    language: "ru",
    mode: "general",
    difficulty: "easy",
    content: "Здравствуйте! Как дела? Россия самая большая страна в мире. Москва красивый и исторический город.",
    wordCount: 16,
  },

  // ARABIC - General
  {
    language: "ar",
    mode: "general",
    difficulty: "easy",
    content: "مرحبا! كيف حالك اليوم؟ اللغة العربية جميلة جداً. الثقافة العربية غنية بالتقاليد والتاريخ.",
    wordCount: 14,
  },

  // KOREAN - General
  {
    language: "ko",
    mode: "general",
    difficulty: "easy",
    content: "안녕하세요! 오늘 날씨가 좋네요. 한국은 기술과 문화로 유명합니다. K-pop과 한국 드라마는 세계적으로 인기가 있습니다.",
    wordCount: 24,
  },

  // MARATHI - General
  {
    language: "mr",
    mode: "general",
    difficulty: "easy",
    content: "नमस्कार! आज हवामान खूप छान आहे. महाराष्ट्र ही भारतातील एक महत्त्वाची राज्य आहे. मराठी भाषा खूप समृद्ध आणि सुंदर आहे.",
    wordCount: 24,
  },
  {
    language: "mr",
    mode: "general",
    difficulty: "medium",
    content: "तंत्रज्ञान आपल्या जीवनात मोठे बदल घडवून आणत आहे. संगणक आणि स्मार्टफोन आता आपल्या दैनंदिन जीवनाचा भाग बनले आहेत. शिक्षण आणि माहिती मिळवणे आता खूप सोपे झाले आहे.",
    wordCount: 30,
  },
  {
    language: "mr",
    mode: "technical",
    difficulty: "medium",
    content: "कृत्रिम बुद्धिमत्ता हे आधुनिक तंत्रज्ञानाचे एक महत्त्वाचे क्षेत्र आहे. मशीन लर्निंग अल्गोरिदम मोठ्या प्रमाणात डेटा विश्लेषण करू शकतात. या तंत्रज्ञानाचा उपयोग आरोग्य, वित्त आणि उत्पादन क्षेत्रात होत आहे.",
    wordCount: 32,
  },

  // BENGALI - General
  {
    language: "bn",
    mode: "general",
    difficulty: "easy",
    content: "নমস্কার! আজ আবহাওয়া খুব ভালো। বাংলাদেশ এবং ভারতে বাংলা ভাষা প্রচলিত। বাংলা সাহিত্য অত্যন্ত সমৃদ্ধ এবং সুন্দর।",
    wordCount: 22,
  },
  {
    language: "bn",
    mode: "general",
    difficulty: "medium",
    content: "প্রযুক্তি আমাদের জীবনে বিপ্লব এনেছে। কম্পিউটার এবং স্মার্টফোন এখন দৈনন্দিন জীবনের অংশ। ইন্টারনেট তথ্য এবং যোগাযোগকে সহজ করেছে।",
    wordCount: 24,
  },

  // TAMIL - General
  {
    language: "ta",
    mode: "general",
    difficulty: "easy",
    content: "வணக்கம்! இன்று வானிலை மிகவும் நன்றாக உள்ளது. தமிழ் மொழி மிகவும் பழமையான மொழிகளில் ஒன்று. தமிழ் இலக்கியம் மிகவும் சிறப்பானது.",
    wordCount: 24,
  },
  {
    language: "ta",
    mode: "general",
    difficulty: "medium",
    content: "தொழில்நுட்பம் நமது வாழ்க்கையில் பெரிய மாற்றங்களை ஏற்படுத்தியுள்ளது. கணினிகள் மற்றும் ஸ்மார்ட்போன்கள் இப்போது அன்றாட வாழ்வின் பகுதியாக உள்ளன. தகவல் மற்றும் தொடர்பு இப்போது மிகவும் எளிதாக உள்ளது.",
    wordCount: 28,
  },

  // TELUGU - General
  {
    language: "te",
    mode: "general",
    difficulty: "easy",
    content: "నమస్కారం! ఈరోజు వాతావరణం చాలా బాగుంది. తెలుగు భాష చాలా మధురమైనది. తెలుగు సాహిత్యం చాలా గొప్పది.",
    wordCount: 18,
  },
  {
    language: "te",
    mode: "general",
    difficulty: "medium",
    content: "సాంకేతికత మన జీవితాలలో పెద్ద మార్పులను తెచ్చింది. కంప్యూటర్లు మరియు స్మార్ట్‌ఫోన్‌లు ఇప్పుడు రోజువారీ జీవితంలో భాగం. సమాచారం మరియు కమ్యూనికేషన్ ఇప్పుడు చాలా సులభం.",
    wordCount: 22,
  },

  // VIETNAMESE - General
  {
    language: "vi",
    mode: "general",
    difficulty: "easy",
    content: "Xin chào! Hôm nay thời tiết rất đẹp. Việt Nam là một đất nước xinh đẹp với văn hóa phong phú. Người Việt Nam rất thân thiện và hiếu khách.",
    wordCount: 29,
  },
  {
    language: "vi",
    mode: "general",
    difficulty: "medium",
    content: "Công nghệ đang thay đổi cuộc sống của chúng ta. Máy tính và điện thoại thông minh đã trở thành một phần không thể thiếu. Internet giúp kết nối mọi người trên toàn thế giới.",
    wordCount: 34,
  },
  {
    language: "vi",
    mode: "technical",
    difficulty: "medium",
    content: "Trí tuệ nhân tạo đang cách mạng hóa nhiều ngành công nghiệp. Các thuật toán học máy có thể phân tích lượng dữ liệu lớn. Công nghệ này được ứng dụng trong y tế, tài chính và sản xuất.",
    wordCount: 35,
  },

  // TURKISH - General
  {
    language: "tr",
    mode: "general",
    difficulty: "easy",
    content: "Merhaba! Bugün hava çok güzel. Türkiye güzel bir ülkedir ve zengin bir tarihe sahiptir. Türk mutfağı dünyada çok ünlüdür.",
    wordCount: 22,
  },
  {
    language: "tr",
    mode: "general",
    difficulty: "medium",
    content: "Teknoloji hayatımızı değiştiriyor. Bilgisayarlar ve akıllı telefonlar artık günlük yaşamımızın bir parçası. İnternet bilgiye erişimi kolaylaştırdı ve dünyayı birbirine bağladı.",
    wordCount: 23,
  },
  {
    language: "tr",
    mode: "technical",
    difficulty: "medium",
    content: "Yapay zeka modern teknolojinin önemli bir alanıdır. Makine öğrenmesi algoritmaları büyük veri kümelerini analiz edebilir. Bu teknoloji sağlık, finans ve üretim sektörlerinde kullanılmaktadır.",
    wordCount: 24,
  },

  // POLISH - General
  {
    language: "pl",
    mode: "general",
    difficulty: "easy",
    content: "Cześć! Dzisiaj pogoda jest bardzo ładna. Polska jest pięknym krajem z bogatą historią. Polska kuchnia jest bardzo smaczna i różnorodna.",
    wordCount: 23,
  },
  {
    language: "pl",
    mode: "general",
    difficulty: "medium",
    content: "Technologia zmienia nasze życie. Komputery i smartfony stały się częścią codzienności. Internet ułatwił dostęp do informacji i połączył ludzi na całym świecie.",
    wordCount: 23,
  },

  // DUTCH - General
  {
    language: "nl",
    mode: "general",
    difficulty: "easy",
    content: "Hallo! Het weer is vandaag heel mooi. Nederland is een prachtig land met rijke geschiedenis. De Nederlandse cultuur is zeer divers en interessant.",
    wordCount: 25,
  },
  {
    language: "nl",
    mode: "general",
    difficulty: "medium",
    content: "Technologie verandert ons leven. Computers en smartphones zijn nu deel van het dagelijks leven. Internet heeft toegang tot informatie vergemakkelijkt en de wereld verbonden.",
    wordCount: 26,
  },

  // SWEDISH - General
  {
    language: "sv",
    mode: "general",
    difficulty: "easy",
    content: "Hej! Vädret är mycket fint idag. Sverige är ett vackert land med rik historia. Svensk kultur är mycket intressant och mångsidig.",
    wordCount: 23,
  },
  {
    language: "sv",
    mode: "general",
    difficulty: "medium",
    content: "Teknologi förändrar våra liv. Datorer och smartphones har blivit en del av vardagen. Internet har gjort det lättare att få tillgång till information och förbundit världen.",
    wordCount: 28,
  },

  // THAI - General
  {
    language: "th",
    mode: "general",
    difficulty: "easy",
    content: "สวัสดีครับ! วันนี้อากาศดีมาก ประเทศไทยเป็นประเทศที่สวยงาม วัฒนธรรมไทยมีความหลากหลายและน่าสนใจ",
    wordCount: 16,
  },
  {
    language: "th",
    mode: "general",
    difficulty: "medium",
    content: "เทคโนโลยีกำลังเปลี่ยนแปลงชีวิตของเรา คอมพิวเตอร์และสมาร์ทโฟนกลายเป็นส่วนหนึ่งของชีวิตประจำวัน อินเทอร์เน็ตทำให้การเข้าถึงข้อมูลง่ายขึ้นและเชื่อมโยงโลก",
    wordCount: 20,
  },

  // INDONESIAN - General
  {
    language: "id",
    mode: "general",
    difficulty: "easy",
    content: "Halo! Cuaca hari ini sangat bagus. Indonesia adalah negara yang indah dengan budaya yang kaya. Makanan Indonesia sangat lezat dan beragam.",
    wordCount: 24,
  },
  {
    language: "id",
    mode: "general",
    difficulty: "medium",
    content: "Teknologi mengubah kehidupan kita. Komputer dan smartphone telah menjadi bagian dari kehidupan sehari-hari. Internet memudahkan akses informasi dan menghubungkan dunia.",
    wordCount: 22,
  },
  {
    language: "id",
    mode: "technical",
    difficulty: "medium",
    content: "Kecerdasan buatan adalah bidang penting dalam teknologi modern. Algoritma pembelajaran mesin dapat menganalisis data dalam jumlah besar. Teknologi ini digunakan dalam kesehatan, keuangan, dan manufaktur.",
    wordCount: 27,
  },

  // ENGLISH - News
  {
    language: "en",
    mode: "news",
    difficulty: "medium",
    content: "Scientists have discovered a breakthrough in renewable energy technology. Solar panels with increased efficiency could revolutionize power generation worldwide. Researchers expect commercial availability within the next five years, potentially reducing carbon emissions significantly.",
    wordCount: 35,
  },

  // ENGLISH - Stories
  {
    language: "en",
    mode: "stories",
    difficulty: "medium",
    content: "Once upon a time in a small village nestled between mountains, there lived a curious girl named Maya. She loved exploring the forests surrounding her home, discovering new plants and animals. One day, while wandering deeper than usual, she stumbled upon a hidden waterfall that sparkled in the sunlight.",
    wordCount: 51,
  },

  // ENGLISH - Business
  {
    language: "en",
    mode: "business",
    difficulty: "medium",
    content: "Effective communication is crucial in modern business environments. Clear emails, professional presentations, and articulate meetings drive successful collaborations. Companies investing in communication training see improved productivity and employee satisfaction. Time management and organizational skills complement strong communication abilities.",
    wordCount: 37,
  },
];

export async function seedTypingParagraphs() {
  console.log("Seeding typing paragraphs...");
  
  try {
    for (const para of paragraphsData) {
      await db.insert(typingParagraphs).values(para);
    }
    console.log(`Successfully seeded ${paragraphsData.length} typing paragraphs`);
  } catch (error) {
    console.error("Error seeding paragraphs:", error);
    throw error;
  }
}

seedTypingParagraphs()
  .then(() => {
    console.log("Seeding completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });
