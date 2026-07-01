// UoK Document-Based Chatbot - Main JavaScript

// ========================================
// Global State & Document Data Loading
// ========================================

let handbookData = [];
let currentLang = "en";
let switchLanguage;

// Sinhala characters check to automatically toggle language
function containsSinhala(text) {
  return /[\u0D80-\u0DFF]/.test(text);
}

// Predefined UI translation messages
const translations = {
  en: {
    welcomeTitle: "Document-Based Assistant",
    welcomeText: "I extract answers directly from the University of Kelaniya Faculty of Science Student Handbook. Ask me details about courses, policies, grading, or regulations.",
    placeholder: "Ask me details from the handbook...",
    fallback: "Not found in document",
    sourceInfo: "Source Document",
    sourcePage: "Student Handbook • Page",
    askGrading: "Grading System",
    askGPA: "GPA Calculation",
    askAttendance: "Attendance Policy",
    askSENG: "Software Engineering",
    askIndustrial: "Industrial Management",
    askAward: "Award of Degree"
  },
  si: {
    welcomeTitle: "අත්පොත පදනම් කරගත් සහකරු",
    welcomeText: "මම කැලණිය විශ්වවිද්‍යාලයීය විද්‍යා පීඨ ශිෂ්‍ය අත්පොතෙන් සෘජුවම තොරතුරු උපුටා දක්වන්නෙමි. පාඨමාලා, නීතිරීති හෝ ශ්‍රේණිගත කිරීම් ගැන විමසන්න.",
    placeholder: "අත්පොතෙන් තොරතුරු විමසන්න...",
    fallback: "Not found in document",
    sourceInfo: "මූලාශ්‍ර ලේඛනය",
    sourcePage: "ශිෂ්‍ය අත්පොත • පිටුව",
    askGrading: "ශ්‍රේණිගත කිරීම් (Grading)",
    askGPA: "GPA ගණනය කිරීම",
    askAttendance: "පැමිණීමේ නීති (Attendance)",
    askSENG: "මෘදුකාංග ඉංජිනේරු විද්‍යාව",
    askIndustrial: "කාර්මික කළමනාකරණය",
    askAward: "උපාධි පිරිනැමීම"
  }
};

// Map popular Sinhala keywords to English equivalents for search
const sinhalaTranslationMap = {
  "විද්‍යා": "science",
  "පීඨය": "faculty",
  "ශ්‍රේණිගත": "grading",
  "ලකුණු": "marks",
  "විභාග": "examination",
  "දේශන": "lectures",
  "පැමිණීම": "attendance",
  "මෘදුකාංග": "software",
  "ඉංජිනේරු": "engineering",
  "ගණිත": "mathematics",
  "රසායන": "chemistry",
  "භෞතික": "physics",
  "සත්ව": "zoology",
  "කළමනාකරණ": "management",
  "කාර්මික": "industrial",
  "පශ්චාත්": "postgraduate",
  "සුභසාධන": "welfare",
  "පුස්තකාලය": "library",
  "ආපනශාලාව": "canteen",
  "ක්‍රීඩාංගනය": "playground",
  "ක්‍රීඩා": "sports",
  "ශිෂ්‍ය": "student",
  "අත්පොත": "handbook",
  "උපාධිය": "degree",
  "අධ්‍යයන": "academic",
  "ලේඛකාධිකාරී": "registrar"
};

// Stopwords to filter out during tokenization
const stopwords = new Set([
  'is', 'the', 'a', 'of', 'how', 'to', 'where', 'what', 'in', 'and', 'for', 'on', 'with', 
  'at', 'by', 'an', 'this', 'that', 'from', 'are', 'about', 'can', 'you', 'i', 'do', 
  'does', 'get', 'find', 'go', 'explain', 'tell', 'me', 'please', 'or', 'details', 'about'
]);

// ========================================
// Document Search Engine
// ========================================

function cleanText(text) {
  return text.toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function extractKeywords(query) {
  let cleanQuery = cleanText(query);
  
  // Translate Sinhala tokens to English terms
  const tokens = cleanQuery.split(' ');
  const translatedTokens = tokens.map(token => {
    if (sinhalaTranslationMap[token]) {
      return sinhalaTranslationMap[token];
    }
    // Check partial matches for Sinhala keywords
    for (let key in sinhalaTranslationMap) {
      if (token.includes(key)) {
        return sinhalaTranslationMap[key];
      }
    }
    return token;
  });

  // Filter stopwords
  return translatedTokens.filter(t => t.length > 1 && !stopwords.has(t));
}

function findBestMatchingPage(query) {
  const keywords = extractKeywords(query);
  if (keywords.length === 0) return null;

  const cleanQuery = cleanText(query);
  let bestPage = null;
  let highestScore = 0;

  handbookData.forEach(pageObj => {
    let score = 0;
    const pageTextLower = pageObj.text.toLowerCase();

    // 1. Check exact phrase matches (gives big bonus)
    // E.g., if "software engineering" matches as a consecutive phrase
    if (cleanQuery.length > 3 && pageTextLower.includes(cleanQuery)) {
      score += 15;
    }

    // 2. Count distinct keyword matches
    let matchedKeywordsCount = 0;
    keywords.forEach(kw => {
      if (pageTextLower.includes(kw)) {
        matchedKeywordsCount++;
        // Add score for first occurrence
        score += 3;
        
        // Add small fractional score for subsequent occurrences
        const regex = new RegExp(kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
        const count = (pageTextLower.match(regex) || []).length;
        score += Math.min(count - 1, 5) * 0.3; 
      }
    });

    // 3. Multiplier for matching multiple keywords on the same page
    if (matchedKeywordsCount > 1) {
      score += matchedKeywordsCount * 2;
    }

    if (score > highestScore) {
      highestScore = score;
      bestPage = {
        page: pageObj.page,
        text: pageObj.text,
        score: score,
        matchedKeywords: keywords.filter(kw => pageTextLower.includes(kw))
      };
    }
  });

  // Apply a minimum score threshold to prevent irrelevant matches
  if (highestScore < 3) {
    return null;
  }

  return bestPage;
}

function extractSnippet(pageObj, keywords) {
  const lines = pageObj.text.split('\n');
  let bestLineIndex = 0;
  let maxLineMatches = 0;

  // Find the line that has the most matching keywords
  lines.forEach((line, idx) => {
    let lineMatches = 0;
    const lineLower = line.toLowerCase();
    keywords.forEach(kw => {
      if (lineLower.includes(kw)) {
        lineMatches++;
      }
    });
    if (lineMatches > maxLineMatches) {
      maxLineMatches = lineMatches;
      bestLineIndex = idx;
    }
  });

  // Extract a window of 6 lines surrounding the best matching line
  const startIdx = Math.max(0, bestLineIndex - 2);
  const endIdx = Math.min(lines.length - 1, bestLineIndex + 3);
  let snippetLines = lines.slice(startIdx, endIdx + 1)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  // If page text is very short, just return the whole page
  if (snippetLines.length === 0) {
    return pageObj.text.replace(/\n/g, '<br>');
  }

  let snippetHtml = snippetLines.join('<br>');

  // Highlight keywords
  keywords.forEach(kw => {
    const escapedKw = kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b(${escapedKw})\\b`, 'gi');
    snippetHtml = snippetHtml.replace(regex, `<span class="highlight">$1</span>`);
  });

  return snippetHtml;
}

// ========================================
// UI Control & Event Listeners
// ========================================

document.addEventListener("DOMContentLoaded", () => {
  const chatContainer = document.getElementById("chatContainer");
  const chatInput = document.getElementById("chatInput");
  const sendBtn = document.getElementById("sendBtn");
  const langToggle = document.getElementById("langToggle");
  const langEn = document.getElementById("langEn");
  const langSi = document.getElementById("langSi");
  const quickReplies = document.getElementById("quickReplies");
  const typingIndicator = document.getElementById("typingIndicator");

  // Welcome UI components to translate
  const welcomeTitle = document.getElementById("welcomeTitle");
  const welcomeText = document.getElementById("welcomeText");
  const headerTitle = document.getElementById("headerTitle");

  // Fetch handbook data on load
  fetch("./handbook_data.json")
    .then(res => res.json())
    .then(data => {
      handbookData = data;
      console.log(`Loaded ${handbookData.length} pages of handbook data.`);
    })
    .catch(err => {
      console.error("Error loading handbook index:", err);
    });

  // Process user input and return bot response HTML
  function processMessage(userText) {
    if (containsSinhala(userText)) {
      switchLanguage("si");
    }

    const match = findBestMatchingPage(userText);

    if (!match) {
      return `<div style="color: var(--text-muted); font-style: italic;">${translations[currentLang].fallback}</div>`;
    }

    // Highlight keywords in the full page text
    let fullPageHtml = match.text.replace(/\n/g, '<br>');
    
    match.matchedKeywords.forEach(kw => {
      const escapedKw = kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b(${escapedKw})\\b`, 'gi');
      fullPageHtml = fullPageHtml.replace(regex, `<span class="highlight">$1</span>`);
    });

    return `<div>${fullPageHtml}</div>`;
  }

  // Update input text height dynamically
  chatInput.addEventListener("input", () => {
    chatInput.style.height = "auto";
    chatInput.style.height = (chatInput.scrollHeight - 6) + "px";
    sendBtn.disabled = chatInput.value.trim() === "";
  });

  // Toggle Language
  switchLanguage = function(lang) {
    if (currentLang === lang) return;
    currentLang = lang;

    if (lang === "en") {
      langEn.classList.add("active");
      langSi.classList.remove("active");
    } else {
      langSi.classList.add("active");
      langEn.classList.remove("active");
    }

    welcomeTitle.innerText = translations[lang].welcomeTitle;
    if (headerTitle) headerTitle.innerText = translations[lang].welcomeTitle;
    welcomeText.innerText = translations[lang].welcomeText;
    chatInput.placeholder = translations[lang].placeholder;

    renderQuickReplies();
  };

  langEn.addEventListener("click", () => switchLanguage("en"));
  langSi.addEventListener("click", () => switchLanguage("si"));

  // Render Quick replies chips
  function renderQuickReplies() {
    quickReplies.innerHTML = "";
    const replies = [
      { text: translations[currentLang].askGrading, query: "grading system" },
      { text: translations[currentLang].askGPA, query: "GPA calculation" },
      { text: translations[currentLang].askAttendance, query: "attendance rules" },
      { text: translations[currentLang].askSENG, query: "software engineering" },
      { text: translations[currentLang].askIndustrial, query: "industrial management" },
      { text: translations[currentLang].askAward, query: "award of degree" }
    ];

    replies.forEach(rep => {
      const btn = document.createElement("button");
      btn.className = "quick-reply-btn";
      btn.innerText = rep.text;
      btn.addEventListener("click", () => {
        chatInput.value = rep.query;
        chatInput.style.height = "auto";
        sendBtn.disabled = false;
        sendMessage();
      });
      quickReplies.appendChild(btn);
    });
  }

  // Append message to UI
  function appendMessage(sender, htmlContent) {
    const welcomeCard = document.getElementById("welcomeCard");
    if (welcomeCard) {
      welcomeCard.style.display = "none";
    }

    const group = document.createElement("div");
    group.className = `message-group ${sender}`;

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.innerText = sender === "user" ? "👤" : "🤖";

    const bubbleWrapper = document.createElement("div");
    bubbleWrapper.style.display = "flex";
    bubbleWrapper.style.flexDirection = "column";

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.innerHTML = htmlContent;

    const time = document.createElement("div");
    time.className = "message-time";
    const now = new Date();
    time.innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    bubbleWrapper.appendChild(bubble);
    bubbleWrapper.appendChild(time);
    
    group.appendChild(avatar);
    group.appendChild(bubbleWrapper);
    
    chatContainer.appendChild(group);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  // Handle Send action
  function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    appendMessage("user", text);
    chatInput.value = "";
    chatInput.style.height = "auto";
    sendBtn.disabled = true;

    typingIndicator.classList.add("active");
    chatContainer.scrollTop = chatContainer.scrollHeight;

    setTimeout(() => {
      typingIndicator.classList.remove("active");
      const botResponse = processMessage(text);
      appendMessage("bot", botResponse);
    }, 850);
  }

  sendBtn.addEventListener("click", sendMessage);
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Initial render
  welcomeTitle.innerText = translations[currentLang].welcomeTitle;
  if (headerTitle) headerTitle.innerText = translations[currentLang].welcomeTitle;
  welcomeText.innerText = translations[currentLang].welcomeText;
  chatInput.placeholder = translations[currentLang].placeholder;
  renderQuickReplies();
});
