Để tận dụng tối đa tài nguyên từ Cloud TTS, hãy tham khảo file cấu hình và UI dưới đây có phù hợp triển khai và áp dụng cho dự án này không?

```markdown
# 📋 GOOGLE CLOUD TTS - CẤU HÌNH CHI TIẾT & UI DESIGN

**Project:** MemoryLang - TTS Admin Configuration  
**Target:** VSCode + Claude Code Implementation  
**Date:** 2026-06-26

---

## 🎯 PHẦN 1: DANH SÁCH ĐẦY ĐỦ GOOGLE CLOUD TTS CONFIGURATIONS

### 1️⃣ VOICE CONFIGURATION (CẤU HÌNH GIỌNG ĐỌC)

#### A. Language Codes (Ngôn ngữ & Accent)
```typescript
const LANGUAGE_CODES = {
  // English Variants
  'en-US': 'English (United States)',
  'en-GB': 'English (United Kingdom)',
  'en-AU': 'English (Australia)',
  'en-IN': 'English (India)',
  'en-PH': 'English (Philippines)',
  
  // European Languages
  'de-DE': 'German (Deutsch)',
  'fr-FR': 'French (Français)',
  'es-ES': 'Spanish (Español)',
  'it-IT': 'Italian (Italiano)',
  'pt-PT': 'Portuguese (Portugal)',
  'pt-BR': 'Portuguese (Brazil)',
  'nl-NL': 'Dutch (Nederlands)',
  'pl-PL': 'Polish (Polski)',
  'ru-RU': 'Russian (Русский)',
  'tr-TR': 'Turkish (Türkçe)',
  'sv-SE': 'Swedish (Svenska)',
  'da-DK': 'Danish (Dansk)',
  'fi-FI': 'Finnish (Suomi)',
  'no-NO': 'Norwegian (Norsk)',
  'cs-CZ': 'Czech (Čeština)',
  'el-GR': 'Greek (Ελληνικά)',
  'hu-HU': 'Hungarian (Magyar)',
  'ro-RO': 'Romanian (Română)',
  'sk-SK': 'Slovak (Slovenčina)',
  'uk-UA': 'Ukrainian (Українська)',
  
  // Asian Languages
  'vi-VN': 'Vietnamese (Tiếng Việt)',
  'ja-JP': 'Japanese (日本語)',
  'ko-KR': 'Korean (한국어)',
  'zh-CN': 'Chinese (Mandarin, Simplified)',
  'zh-TW': 'Chinese (Mandarin, Traditional)',
  'zh-HK': 'Chinese (Cantonese)',
  'th-TH': 'Thai (ไทย)',
  'id-ID': 'Indonesian (Bahasa Indonesia)',
  'ms-MY': 'Malay (Bahasa Melayu)',
  'tl-PH': 'Filipino (Filipino)',
  
  // Middle East & Africa
  'ar-XA': 'Arabic (العربية)',
  'he-IL': 'Hebrew (עברית)',
  'hi-IN': 'Hindi (हिन्दी)',
  'bn-IN': 'Bengali (বাংলা)',
  'ta-IN': 'Tamil (தமிழ்)',
  'te-IN': 'Telugu (తెలుగు)',
  'mr-IN': 'Marathi (मराठी)',
  'gu-IN': 'Gujarati (ગુજરાતી)',
  'kn-IN': 'Kannada (ಕನ್ನಡ)',
  'ml-IN': 'Malayalam (മലയാളം)',
  'pa-IN': 'Punjabi (ਪੰਜਾਬੀ)',
  
  // Others
  'fil-PH': 'Filipino',
  'cmn-CN': 'Chinese (Mandarin)',
};
```

#### B. Voice Types & Quality Levels
```typescript
const VOICE_TYPES = {
  // Standard voices - cheapest
  'Standard': {
    quality: 'Basic',
    pricePerMillion: 4.00, // USD
    description: 'Giọng cơ bản, phù hợp cho nội dung dài, ít quan trọng',
    neuralNetwork: false
  },
  
  // WaveNet voices - high quality
  'WaveNet': {
    quality: 'High',
    pricePerMillion: 16.00,
    description: 'Giọng AI cao cấp, tự nhiên, có ngữ điệu',
    neuralNetwork: true
  },
  
  // Neural2 voices - latest & best
  'Neural2': {
    quality: 'Premium',
    pricePerMillion: 16.00,
    description: 'Giọng AI thế hệ mới nhất, chất lượng cao nhất',
    neuralNetwork: true
  },
  
  // Studio voices - ultra realistic (mới nhất)
  'Studio': {
    quality: 'Ultra Premium',
    pricePerMillion: 16.00,
    description: 'Giọng studio chất lượng cực cao',
    neuralNetwork: true
  },
  
  // Journey voices - conversational
  'Journey': {
    quality: 'Conversational',
    pricePerMillion: 16.00,
    description: 'Giọng hội thoại tự nhiên',
    neuralNetwork: true
  }
};
```

#### C. Gender Options
```typescript
const SSML_GENDERS = {
  'MALE': 'Nam',
  'FEMALE': 'Nữ',
  'NEUTRAL': 'Trung tính'
};
```

#### D. Sample Voice Names (Popular)
```typescript
const POPULAR_VOICES = {
  'en-US': [
    { name: 'en-US-Neural2-A', gender: 'FEMALE', type: 'Neural2' },
    { name: 'en-US-Neural2-B', gender: 'MALE', type: 'Neural2' },
    { name: 'en-US-Neural2-C', gender: 'FEMALE', type: 'Neural2' },
    { name: 'en-US-Neural2-D', gender: 'MALE', type: 'Neural2' },
    { name: 'en-US-Neural2-E', gender: 'FEMALE', type: 'Neural2' },
    { name: 'en-US-Neural2-F', gender: 'FEMALE', type: 'Neural2' },
    { name: 'en-US-Neural2-G', gender: 'FEMALE', type: 'Neural2' },
    { name: 'en-US-Neural2-H', gender: 'FEMALE', type: 'Neural2' },
    { name: 'en-US-Neural2-I', gender: 'MALE', type: 'Neural2' },
    { name: 'en-US-Neural2-J', gender: 'MALE', type: 'Neural2' },
    { name: 'en-US-Wavenet-A', gender: 'FEMALE', type: 'WaveNet' },
    { name: 'en-US-Wavenet-B', gender: 'MALE', type: 'WaveNet' },
    { name: 'en-US-Wavenet-C', gender: 'FEMALE', type: 'WaveNet' },
    { name: 'en-US-Wavenet-D', gender: 'MALE', type: 'WaveNet' },
    { name: 'en-US-Standard-A', gender: 'FEMALE', type: 'Standard' },
    { name: 'en-US-Standard-B', gender: 'MALE', type: 'Standard' },
  ],
  'en-GB': [
    { name: 'en-GB-Neural2-A', gender: 'FEMALE', type: 'Neural2' },
    { name: 'en-GB-Neural2-B', gender: 'MALE', type: 'Neural2' },
    { name: 'en-GB-Neural2-C', gender: 'FEMALE', type: 'Neural2' },
    { name: 'en-GB-Neural2-D', gender: 'MALE', type: 'Neural2' },
    { name: 'en-GB-Neural2-F', gender: 'FEMALE', type: 'Neural2' },
    { name: 'en-GB-Wavenet-A', gender: 'FEMALE', type: 'WaveNet' },
    { name: 'en-GB-Wavenet-B', gender: 'MALE', type: 'WaveNet' },
    { name: 'en-GB-Wavenet-C', gender: 'FEMALE', type: 'WaveNet' },
    { name: 'en-GB-Wavenet-D', gender: 'MALE', type: 'WaveNet' },
  ],
  'vi-VN': [
    { name: 'vi-VN-Wavenet-A', gender: 'FEMALE', type: 'WaveNet' },
    { name: 'vi-VN-Wavenet-B', gender: 'FEMALE', type: 'WaveNet' },
    { name: 'vi-VN-Wavenet-C', gender: 'MALE', type: 'WaveNet' },
    { name: 'vi-VN-Wavenet-D', gender: 'FEMALE', type: 'WaveNet' },
    { name: 'vi-VN-Standard-A', gender: 'FEMALE', type: 'Standard' },
    { name: 'vi-VN-Standard-B', gender: 'FEMALE', type: 'Standard' },
    { name: 'vi-VN-Standard-C', gender: 'MALE', type: 'Standard' },
    { name: 'vi-VN-Standard-D', gender: 'FEMALE', type: 'Standard' },
  ],
  // Add more languages as needed...
};
```

---

### 2️⃣ AUDIO CONFIGURATION (CẤU HÌNH ÂM THANH)

#### A. Audio Encoding Formats
```typescript
const AUDIO_ENCODINGS = {
  'LINEAR16': {
    description: 'Uncompressed 16-bit signed little-endian samples',
    mimeType: 'audio/L16;rate=',
    fileExtension: '.wav',
    quality: 'Lossless',
    fileSize: 'Large'
  },
  'MP3': {
    description: 'MP3 audio format (phổ biến nhất)',
    mimeType: 'audio/mpeg',
    fileExtension: '.mp3',
    quality: 'Lossy',
    fileSize: 'Medium',
    recommended: true
  },
  'OGG_OPUS': {
    description: 'Opus encoded audio wrapped in an ogg container',
    mimeType: 'audio/ogg; codecs=opus',
    fileExtension: '.ogg',
    quality: 'High',
    fileSize: 'Small'
  },
  'MULAW': {
    description: '8-bit samples that compand the samples',
    mimeType: 'audio/basic',
    fileExtension: '.wav',
    quality: 'Low',
    fileSize: 'Small'
  },
  'ALAW': {
    description: '8-bit samples that compand the samples',
    mimeType: 'audio/basic',
    fileExtension: '.wav',
    quality: 'Low',
    fileSize: 'Small'
  },
  'PCM': {
    description: 'Pulse-code modulation',
    mimeType: 'audio/L16;rate=',
    fileExtension: '.wav',
    quality: 'Lossless',
    fileSize: 'Large'
  }
};
```

#### B. Speaking Rate (Tốc độ đọc)
```typescript
const SPEAKING_RATE_CONFIG = {
  min: 0.25,        // Chậm nhất (1/4 tốc độ bình thường)
  max: 4.0,         // Nhanh nhất (gấp 4 lần)
  default: 1.0,     // Tốc độ bình thường
  step: 0.05,       // Bước nhảy khi slider
  
  presets: {
    'very-slow': { value: 0.5, label: 'Rất chậm (0.5x)', useCase: 'Học phát âm chi tiết' },
    'slow': { value: 0.75, label: 'Chậm (0.75x)', useCase: 'Người mới bắt đầu' },
    'normal': { value: 1.0, label: 'Bình thường (1.0x)', useCase: 'Giao tiếp thường' },
    'fast': { value: 1.25, label: 'Nhanh (1.25x)', useCase: 'Luyện nghe nhanh' },
    'very-fast': { value: 1.5, label: 'Rất nhanh (1.5x)', useCase: 'Thử thách cao cấp' }
  },
  
  recommendations: {
    vocabulary: 0.85,      // Từ vựng: chậm hơn bình thường
    conversation: 1.0,     // Hội thoại: bình thường
    listening_test: 1.0,   // Bài kiểm tra nghe: bình thường
    story: 0.95,           // Kể chuyện: hơi chậm
    news: 1.0,             // Tin tức: bình thường
  }
};
```

#### C. Pitch (Độ cao)
```typescript
const PITCH_CONFIG = {
  min: -20.0,       // Thấp nhất (giọng trầm)
  max: 20.0,        // Cao nhất (giọng bổng)
  default: 0.0,     // Bình thường
  step: 0.5,        // Bước nhảy (semis)
  
  presets: {
    'very-low': { value: -10.0, label: 'Rất trầm', useCase: 'Giọng nam sâu' },
    'low': { value: -5.0, label: 'Trầm', useCase: 'Giọng nam' },
    'normal': { value: 0.0, label: 'Bình thường', useCase: 'Mặc định' },
    'high': { value: 5.0, label: 'Bổng', useCase: 'Giọng nữ' },
    'very-high': { value: 10.0, label: 'Rất bổng', useCase: 'Giọng nữ cao' }
  },
  
  effects: {
    'deeper': -4.0,     // Làm giọng trầm hơn
    'brighter': 4.0,    // Làm giọng sáng hơn
    'authoritative': -2.0, // Giọng uy quyền
    'friendly': 2.0     // Giọng thân thiện
  }
};
```

#### D. Volume Gain (Âm lượng)
```typescript
const VOLUME_CONFIG = {
  min: -96.0,       // Im lặng hoàn toàn
  max: 16.0,        // Tăng âm lượng tối đa
  default: 0.0,     // Âm lượng gốc
  step: 1.0,        // Bước nhảy (dB)
  
  presets: {
    'very-quiet': { value: -20.0, label: 'Rất nhỏ' },
    'quiet': { value: -10.0, label: 'Nhỏ' },
    'normal': { value: 0.0, label: 'Bình thường' },
    'loud': { value: 5.0, label: 'To' },
    'very-loud': { value: 10.0, label: 'Rất to' }
  },
  
  recommendations: {
    headphone: 0.0,         // Tai nghe: bình thường
    speaker: 3.0,           // Loa: tăng nhẹ
    mobile: 2.0,            // Điện thoại: tăng nhẹ
    automotive: 5.0,        // Ô tô: tăng nhiều
  }
};
```

#### E. Sample Rate Hertz (Tần số mẫu)
```typescript
const SAMPLE_RATES = {
  '8000': {
    quality: 'Telephony',
    description: 'Chất lượng điện thoại',
    fileSize: 'Rất nhỏ',
    useCase: 'IVR, điện thoại'
  },
  '16000': {
    quality: 'Narrowband',
    description: 'Chất lượng hẹp',
    fileSize: 'Nhỏ',
    useCase: 'Ghi âm cơ bản'
  },
  '22050': {
    quality: 'FM Radio',
    description: 'Chất lượng radio FM',
    fileSize: 'Trung bình',
    useCase: 'Podcast cơ bản'
  },
  '24000': {
    quality: 'Standard',
    description: 'Chất lượng chuẩn (mặc định)',
    fileSize: 'Trung bình',
    useCase: 'Web, app học tập',
    recommended: true
  },
  '32000': {
    quality: 'Wideband',
    description: 'Chất lượng rộng',
    fileSize: 'Lớn',
    useCase: 'Audio chất lượng cao'
  },
  '44100': {
    quality: 'CD Quality',
    description: 'Chất lượng CD',
    fileSize: 'Lớn',
    useCase: 'Âm nhạc, professional'
  },
  '48000': {
    quality: 'Professional',
    description: 'Chất lượng chuyên nghiệp',
    fileSize: 'Rất lớn',
    useCase: 'Studio, broadcast'
  }
};
```

#### F. Audio Effects Profile (Hiệu ứng thiết bị)
```typescript
const AUDIO_EFFECTS_PROFILES = {
  'wearable-class-device': {
    icon: '⌚',
    label: 'Smartwatch / Wearable',
    description: 'Tối ưu cho thiết bị đeo',
    frequency: 'Narrow',
    useCase: 'Apple Watch, Wear OS'
  },
  'handset-class-device': {
    icon: '📱',
    label: 'Smartphone Speaker',
    description: 'Loa ngoài điện thoại',
    frequency: 'Medium',
    useCase: 'iPhone, Android loa ngoài'
  },
  'headphone-class-device': {
    icon: '🎧',
    label: 'Headphones',
    description: 'Tai nghe (KHUYẾN NGHỊ)',
    frequency: 'Full range',
    useCase: 'Tai nghe có dây, bluetooth',
    recommended: true
  },
  'small-bluetooth-speaker-class-device': {
    icon: '🔊',
    label: 'Small Bluetooth Speaker',
    description: 'Loa Bluetooth nhỏ',
    frequency: 'Medium-High',
    useCase: 'Loa di động nhỏ'
  },
  'medium-bluetooth-speaker-class-device': {
    icon: '🔊',
    label: 'Medium Bluetooth Speaker',
    description: 'Loa Bluetooth vừa',
    frequency: 'Full range',
    useCase: 'Loa JBL, Bose nhỏ'
  },
  'large-home-entertainment-class-device': {
    icon: '🏠',
    label: 'Large Home Entertainment',
    description: 'Hệ thống giải trí gia đình',
    frequency: 'Full range + Bass',
    useCase: 'Home theater, soundbar'
  },
  'large-automotive-class-device': {
    icon: '🚗',
    label: 'Automotive Audio',
    description: 'Âm thanh ô tô',
    frequency: 'Full range',
    useCase: 'Loa xe hơi'
  },
  'telephony-class-device': {
    icon: '☎️',
    label: 'Telephony',
    description: 'Thiết bị điện thoại',
    frequency: 'Narrow (300-3400 Hz)',
    useCase: 'Call center, IVR'
  }
};
```

---

### 3️⃣ SSML CONFIGURATION (CẤU HÌNH NÂNG CAO)

#### A. SSML Tags Support
```typescript
const SSML_TAGS = {
  break: {
    tag: '<break time="500ms"/>',
    description: 'Ngắt nghỉ',
    attributes: {
      time: {
        values: ['250ms', '500ms', '1s', '2s'],
        description: 'Thời gian ngắt'
      },
      strength: {
        values: ['x-weak', 'weak', 'medium', 'strong', 'x-strong'],
        description: 'Mức độ ngắt'
      }
    },
    example: 'Hello. <break time="500ms"/> How are you?'
  },
  
  emphasis: {
    tag: '<emphasis level="strong">word</emphasis>',
    description: 'Nhấn mạnh từ',
    attributes: {
      level: {
        values: ['reduced', 'moderate', 'strong'],
        description: 'Mức độ nhấn mạnh'
      }
    },
    example: 'I <emphasis level="strong">love</emphasis> this!'
  },
  
  'say-as': {
    tag: '<say-as interpret-as="characters">ABC</say-as>',
    description: 'Cách đọc đặc biệt',
    interpretAs: {
      characters: 'Đọc từng ký tự (A-B-C)',
      cardinal: 'Đọc số (123 = one hundred twenty-three)',
      ordinal: 'Đọc số thứ tự (1st = first)',
      digits: 'Đọc từng số (123 = one two three)',
      fraction: 'Đọc phân số (1/2 = one half)',
      unit: 'Đọc đơn vị (5kg = five kilograms)',
      date: 'Đọc ngày tháng',
      time: 'Đọc thời gian',
      address: 'Đọc địa chỉ',
      expletive: 'Kiểm duyệt từ'
    },
    example: '<say-as interpret-as="characters">TTS</say-as>'
  },
  
  phoneme: {
    tag: '<phoneme alphabet="ipa" ph="ˈæpəl">apple</phoneme>',
    description: 'Phát âm chuẩn IPA',
    attributes: {
      alphabet: {
        values: ['ipa'],
        description: 'Bảng chữ cái phiên âm'
      },
      ph: {
        description: 'Chuỗi IPA'
      }
    },
    example: '<phoneme alphabet="ipa" ph="həˈloʊ">hello</phoneme>'
  },
  
  sub: {
    tag: '<sub alias="Google">GOOG</sub>',
    description: 'Thay thế cách đọc',
    attributes: {
      alias: {
        description: 'Văn bản thay thế'
      }
    },
    example: '<sub alias="HyperText Markup Language">HTML</sub>'
  },
  
  prosody: {
    tag: '<prosody rate="slow" pitch="low">text</prosody>',
    description: 'Điều chỉnh ngữ điệu',
    attributes: {
      rate: {
        values: ['x-slow', 'slow', 'medium', 'fast', 'x-fast'],
        description: 'Tốc độ'
      },
      pitch: {
        values: ['x-low', 'low', 'medium', 'high', 'x-high'],
        description: 'Độ cao'
      },
      volume: {
        values: ['silent', 'x-soft', 'soft', 'medium', 'loud', 'x-loud'],
        description: 'Âm lượng'
      }
    },
    example: '<prosody rate="slow">Speak slowly</prosody>'
  },
  
  mark: {
    tag: '<mark name="point1"/>',
    description: 'Đánh dấu vị trí (dùng với SSML metadata)',
    attributes: {
      name: {
        description: 'Tên mark'
      }
    },
    example: 'Before <mark name="here"/> after'
  },
  
  lang: {
    tag: '<lang xml:lang="en-US">text</lang>',
    description: 'Chuyển ngôn ngữ trong câu',
    attributes: {
      'xml:lang': {
        description: 'Mã ngôn ngữ'
      }
    },
    example: 'Hello <lang xml:lang="fr-FR">bonjour</lang> world'
  },
  
  voice: {
    tag: '<voice name="en-US-Wavenet-D">text</voice>',
    description: 'Thay đổi giọng trong câu',
    attributes: {
      name: {
        description: 'Tên giọng Google'
      }
    },
    example: '<voice name="en-US-Wavenet-D">Male voice</voice>'
  },
  
  audio: {
    tag: '<audio src="https://example.com/sound.mp3"/>',
    description: 'Chèn âm thanh bên ngoài',
    attributes: {
      src: {
        description: 'URL file âm thanh'
      }
    },
    example: '<audio src="https://example.com/applause.mp3"/>'
  },
  
  desc: {
    tag: '<desc>Description text</desc>',
    description: 'Mô tả (không đọc, dùng cho screen reader)',
    example: 'Click the button <desc>Submit form</desc>'
  },
  
  'amazon:effect': {
    tag: '<amazon:effect name="whispered">text</amazon:effect>',
    description: 'Hiệu ứng đặc biệt (chỉ một số giọng hỗ trợ)',
    attributes: {
      name: {
        values: ['whispered', 'conversational'],
        description: 'Tên hiệu ứng'
      },
      phonation: {
        values: ['soft', 'normal', 'loud'],
        description: 'Độ to'
      }
    },
    example: '<amazon:effect name="whispered">Secret</amazon:effect>'
  }
};
```

#### B. SSML Presets cho EdTech
```typescript
const SSML_PRESETS = {
  vocabulary_learning: {
    name: 'Học từ vựng',
    description: 'Đọc từ chậm, rõ ràng, có ngắt nghỉ',
    template: '<speak><prosody rate="0.85">{word}</prosody><break time="500ms"/><prosody rate="1.0">{definition}</prosody></speak>'
  },
  
  pronunciation_practice: {
    name: 'Luyện phát âm',
    description: 'Đọc từng âm tiết',
    template: '<speak><prosody rate="0.75">{syllable1}</prosody><break time="300ms"/><prosody rate="0.75">{syllable2}</prosody><break time="500ms"/><prosody rate="1.0">{fullWord}</prosody></speak>'
  },
  
  conversation: {
    name: 'Hội thoại',
    description: 'Đọc tự nhiên như giao tiếp',
    template: '<speak><prosody rate="1.0" pitch="0">{text}</prosody></speak>'
  },
  
  dictation: {
    name: 'Chính tả',
    description: 'Đọc từng ký tự',
    template: '<speak><say-as interpret-as="characters">{text}</say-as></speak>'
  },
  
  numbers: {
    name: 'Đọc số',
    description: 'Đọc số rõ ràng',
    template: '<speak><say-as interpret-as="cardinal">{number}</say-as></speak>'
  },
  
  date_time: {
    name: 'Ngày giờ',
    description: 'Đọc ngày tháng, thời gian',
    template: '<speak><say-as interpret-as="date">{date}</say-as></speak>'
  },
  
  spelling: {
    name: 'Đánh vần',
    description: 'Đánh vần từng chữ cái',
    template: '<speak><say-as interpret-as="characters">{word}</say-as></speak>'
  },
  
  story_reading: {
    name: 'Kể chuyện',
    description: 'Đọc chuyện với ngữ điệu',
    template: '<speak><prosody rate="0.95" pitch="2">{story}</prosody></speak>'
  },
  
  news_reading: {
    name: 'Đọc tin tức',
    description: 'Đọc tin tức chuyên nghiệp',
    template: '<speak><prosody rate="1.0" pitch="0">{news}</prosody></speak>'
  },
  
  exam_listening: {
    name: 'Bài kiểm tra nghe',
    description: 'Đọc chuẩn cho bài thi',
    template: '<speak><prosody rate="1.0" pitch="0" volume="0">{question}</prosody><break time="10s"/><prosody rate="1.0">{answer}</prosody></speak>'
  }
};
```

---

### 4️⃣ CACHE & PERFORMANCE CONFIGURATION

```typescript
const CACHE_CONFIG = {
  // Cache trên CDN (Cloudflare R2)
  cdn: {
    enabled: true,
    ttl_seconds: 31536000, // 1 năm
    cacheControl: 'public, max-age=31536000',
    description: 'Cache file audio trên CDN'
  },
  
  // Cache trong database (Supabase)
  database: {
    enabled: true,
    storeMetadata: true,
    fields: [
      'id',
      'text_hash',
      'voice_name',
      'language_code',
      'audio_url',
      'duration_seconds',
      'file_size_bytes',
      'created_at',
      'access_count',
      'last_accessed_at'
    ]
  },
  
  // Cache trên trình duyệt (Browser)
  browser: {
    enabled: true,
    storageType: 'localStorage', // hoặc 'indexedDB'
    maxSizeMB: 100,
    expiryDays: 30
  },
  
  // Cache invalidation
  invalidation: {
    strategy: 'time-based', // hoặc 'manual'
    autoInvalidateOnConfigChange: true,
    notifyUsersOnChange: false
  }
};
```

---

### 5️⃣ COST ESTIMATION CONFIGURATION

```typescript
const PRICING = {
  // Giá theo loại giọng (USD per 1 million characters)
  voices: {
    Standard: 4.00,
    WaveNet: 16.00,
    Neural2: 16.00,
    Studio: 16.00,
    Journey: 16.00
  },
  
  // Free tier (Google Cloud)
  freeTier: {
    Standard: 1000000, // 1 triệu ký tự/tháng
    WaveNet: 100000,   // 100k ký tự/tháng
    Neural2: 100000,   // 100k ký tự/tháng
    Studio: 0,         // Không có free tier
    Journey: 0
  },
  
  // Ước tính chi phí
  estimation: {
    averageCharPerWord: 5,
    averageWordsPerMinute: 150,
    bufferPercentage: 20 // Thêm 20% buffer
  }
};
```

---

## 🎨 PHẦN 2: UI/UX DESIGN CHO TRANG ADMIN

### 📐 LAYOUT TỔNG THỂ

```
┌─────────────────────────────────────────────────────────────────────────┐
│  HEADER                                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 🔊 CẤU HÌNH TTS                              [💾 Lưu] [🔄 Reset] │   │
│  │ Cấu hình giọng đọc Google Cloud Text-to-Speech                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
├──────────────┬──────────────────────────────────────────────────────────┤
│              │  TAB NAVIGATION                                          │
│  SIDEBAR     │  [📋 Danh sách] [➕ Thêm mới] [📊 Thống kê] [⚙️ Cài đặt]│
│  (Menu)      ├──────────────────────────────────────────────────────────┤
│              │                                                          │
│  - Dashboard │  MAIN CONTENT AREA                                       │
│  - TTS Config│  ┌────────────────────────────────────────────────────┐ │
│  - Languages │  │                                                    │ │
│  - Voices    │  │  TABLE: Danh sách cấu hình                         │ │
│  - Cache     │  │  ┌────┬─────────┬─────────┬────────┬──────────┐   │ │
│  - Costs     │  │  │Mã  │Giọng    │Tốc độ/  │Giới    │Actions   │   │ │
│  - Logs      │  │  ├────┼─────────┼─────────┼────────┼──────────┤   │ │
│              │  │  │EN-US│Neural2-D│1.0x / 0 │Nam     │✏️ ️ 👁️ │   │ │
│              │  │  └────┴─────────┴─────────┴────────┴──────────┘   │ │
│              │  │                                                    │ │
│              │  └────────────────────────────────────────────────────┘ │
│              │                                                          │
│              │  RIGHT SIDEBAR (Preview Panel)                          │
│              │  ┌────────────────────────────────────────────────────┐ │
│              │  │ 🔊 THỬ GIỌNG ĐỌC TTS                               │ │
│              │  ├────────────────────────────────────────────────────┤ │
│              │  │ Ngôn ngữ: [en-US (Anh-Mỹ) ▼]                      │ │
│              │  │ Giọng:    [en-US-Neural2-D ▼] [🔊]                │ │
│              │  │ Tốc độ:   [━━━━━●━━━━] 1.0x                       │ │
│              │  │ Cao độ:   [━━━━━━●━━━] 0.0                        │ │
│              │  │ Âm lượng: [━━━━━━━━●━] 0 dB                       │ │
│              │  │ Thiết bị: [🎧 Tai nghe ▼]                         │ │
│              │  ├────────────────────────────────────────────────────┤ │
│              │  │ Văn bản test:                                      │ │
│              │  │ ┌──────────────────────────────────────────────┐  │ │
│              │  │ │ Welcome to MemoryLang! Let's learn some...   │  │ │
│              │  │ └──────────────────────────────────────────────┘  │ │
│              │  │                                                    │ │
│              │  │ [🔊 Nghe thử] [🎵 So sánh] [💾 Lưu preset]       │ │
│              │  └────────────────────────────────────────────────────┘ │
│              │                                                          │
└──────────────┴──────────────────────────────────────────────────────────┘
```

---

### 📋 CHI TIẾT CÁC COMPONENT

#### 1. Bảng danh sách cấu hình (Configuration Table)

**Columns:**
- **Mã ngôn ngữ** (Language Code): Badge với flag
  - Format: `EN-US` với flag 🇺
  - Click để filter
  
- **Giọng đọc** (Voice Name):
  - Hiển thị: `en-US-Neural2-D`
  - Subtext: `Neural2 • Nam • 24kHz`
  - Color coding theo loại:
    - Standard: Xám
    - WaveNet: Xanh dương
    - Neural2: Tím
    - Studio: Vàng gold
  
- **Tốc độ / Độ cao** (Rate / Pitch):
  - Format: `1.0x / 0st`
  - Icon indicator nếu khác default
  
- **Giới tính** (Gender):
  - Badge: `Nam` (xanh), `Nữ` (hồng), `Trung tính` (xám)
  
- **Chất lượng** (Quality):
  - Stars: ⭐⭐⭐⭐⭐ (Neural2)
  - Stars: ⭐⭐⭐⭐ (WaveNet)
  - Stars: ⭐⭐⭐ (Standard)
  
- **Chi phí ước tính** (Cost):
  - `$16/1M chars`
  - Badge màu: Xanh (rẻ), Vàng (TB), Đỏ (đắt)
  
- **Lượt dùng** (Usage):
  - `1,234 lần`
  - `45.2MB`
  
- **Trạng thái cache** (Cache Status):
  - 🟢 Active (95% hit rate)
  - 🟡 Partial
  - 🔴 Disabled
  
- **Actions**:
  - ✏️ Edit (mở modal/form)
  - 👁️ Preview (nghe thử nhanh)
  - 🗑️ Delete (xác nhận)
  - 📊 Stats (thống kê chi tiết)
  - 🔄 Reset (về default)

**Table Features:**
- ✅ Sortable columns
- ✅ Search/filter
- ✅ Pagination (10/25/50/100 per page)
- ✅ Bulk actions (select multiple)
- ✅ Export CSV/JSON
- ✅ Inline editing (double-click)

---

#### 2. Form cấu hình chi tiết (Detail Form)

**Section 1: Thông tin cơ bản**
```
┌─────────────────────────────────────────────────────────────┐
│ 📝 THÔNG TIN CƠ BẢN                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Mã ngôn ngữ *                                               │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ 🇺 en-US - English (United States)           [🔽] │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ Tên giọng đọc *                                            │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ en-US-Neural2-D                                [🔽] │   │
│ └─────────────────────────────────────────────────────┘   │
│ ℹ️ Neural2 • Nam • 24kHz • $16/1M chars                   │
│ [🔊 Nghe thử giọng này]                                    │
│                                                             │
│ Giới tính                                                  │
│ ○ Nam  ● Nữ  ○ Trung tính                                 │
│                                                             │
│ Mô tả                                                      │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ Giọng nam Mỹ, phù hợp cho bài giảng...              │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Section 2: Cấu hình âm thanh**
```
┌─────────────────────────────────────────────────────────────┐
│ 🎵 CẤU HÌNH ÂM THANH                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Định dạng audio                                            │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────          │
│ │  ● MP3  │ │ LINEAR16│ │OGG_OPUS │ │  MULAW  │          │
│ └─────────┘ └───────── └─────────┘ ─────────┘          │
│                                                             │
│ Tốc độ đọc (Speaking Rate)                                 │
│ ━━━━━━━━●━━━━━━━━ 1.0x                                    │
│ 0.25x         1.0x         4.0x                            │
│ [0.5x] [0.75x] [1.0x] [1.25x] [1.5x] (Presets)             │
│                                                             │
│ Độ cao (Pitch)                                             │
│ ━━━━━━━━●━━━━━━━━ 0.0st                                    │
│ -20.0st       0.0st      +20.0st                           │
│ [-10] [-5] [0] [+5] [+10] (Presets)                        │
│                                                             │
│ Âm lượng (Volume Gain)                                     │
│ ━━━━━━━━●━━━━━━━━ 0.0 dB                                   │
│ -96dB        0dB        +16dB                              │
│ [-10] [-5] [0] [+5] [+10] (Presets)                        │
│                                                             │
│ Tần số mẫu (Sample Rate)                                   │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ 24000 Hz - Chất lượng chuẩn (khuyến nghị)      [🔽] │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ Hiệu ứng thiết bị (Audio Effects)                          │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ 🎧 headphone-class-device                      [🔽] │   │
│ └─────────────────────────────────────────────────────┘   │
│ Tối ưu cho tai nghe, chất lượng âm thanh tốt nhất         │
│                                                             │
│ ☑ Enable audio effects                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Section 3: SSML (Nâng cao)**
```
┌─────────────────────────────────────────────────────────────┐
│ 📜 SSML (SPEECH SYNTHESIS MARKUP LANGUAGE)         [🔽🔼]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ☐ Bật chế độ SSML (dành cho admin nâng cao)                │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ <speak>                                              │   │
│ │   Hello! <break time="500ms"/>                      │   │
│ │   <prosody rate="0.9">Welcome to our course.</prosody>│   │
│ │ </speak>                                             │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ [📚 Chèn tag SSML] [🎯 Presets] [✅ Validate]              │
│                                                             │
│ Presets nhanh:                                             │
│ [Học từ vựng] [Hội thoại] [Chính tả] [Ngày giờ]           │
│                                                             │
│ ⚠️ SSML chỉ hoạt động khi input là text dạng SSML         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Section 4: Cache & Performance**
```
┌─────────────────────────────────────────────────────────────┐
│ 💾 CACHE & PERFORMANCE                            [🔽🔼]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ☑ Bật cache CDN (Cloudflare R2)                            │
│   Thời gian cache: [365] ngày                              │
│   Cache-Control: public, max-age=31536000                  │
│                                                             │
│ ☑ Bật cache database (Supabase)                            │
│   Lưu metadata: ☑ Duration  ☑ File size  ☑ Access count   │
│                                                             │
│ ☑ Bật cache browser                                        │
│   Storage type: ● localStorage ○ indexedDB                 │
│   Max size: [100] MB                                       │
│   Expiry: [30] ngày                                        │
│                                                             │
│ [🗑️ Xóa cache] [📊 Thống kê cache]                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Section 5: Cost Estimation**
```
┌─────────────────────────────────────────────────────────────┐
│ 💰 ƯỚC TÍNH CHI PHÍ                               [🔽🔼]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Loại giọng: Neural2                                        │
│ Giá: $16.00 / 1 triệu ký tự                                │
│ Free tier: 100,000 ký tự/tháng                             │
│                                                             │
│ ─────────────────────────────────────────────────          │
│                                                             │
│ Thống kê tháng này:                                        │
│ • Tổng ký tự: 45,230                                       │
│ • Nằm trong free tier: ✅                                  │
│ • Chi phí: $0.00 (miễn phí)                                │
│                                                             │
│ Dự kiến tháng sau:                                         │
│ • Nếu 100,000 ký tự: $0.00 (free tier)                     │
│ • Nếu 500,000 ký tự: $6.40                                 │
│ • Nếu 1,000,000 ký tự: $16.00                              │
│                                                             │
│ [📊 Xem chi tiết] [⚠️ Cài alert]                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Section 6: Actions**
```
┌─────────────────────────────────────────────────────────────┐
│ ⚡ ACTIONS                                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ [💾 Lưu cấu hình]  [🔄 Reset]  [❌ Hủy]                     │
│                                                             │
│ Advanced:                                                   │
│ [📥 Export JSON]  [📤 Import]  [🗑️ Delete]                 │
│                                                             │
│ ☑ Đặt làm cấu hình mặc định cho ngôn ngữ này               │
│ ☑ Áp dụng cho tất cả ngôn ngữ tương tự                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

#### 3. Preview Panel (Panel bên phải)

```
┌─────────────────────────────────────────────────────────────┐
│ 🔊 THỬ GIỌNG ĐỌC TTS                           [📏 Resize] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Chọn ngôn ngữ                                               │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ 🇺🇸 en-US - English (United States)           [🔽] │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ Giọng đọc (Google voice name)                              │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ en-US-Neural2-D                                [🔽] │   │
│ └─────────────────────────────────────────────────────┘   │
│ ℹ️ Neural2 • Nam • $16/1M chars                           │
│                                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│ Tốc độ:        [━━━━━●━━━━] 1.0x                          │
│ Cao độ:        [━━━━━━●━━━] 0.0                           │
│ Âm lượng:      [━━━━━━━━●━] 0 dB                          │
│                                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│ Văn bản phát thử (Text)                                    │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ Welcome to MemoryLang! Let's learn some vocabulary. │   │
│ │                                                     │   │
│ │                                                     │   │
│ └─────────────────────────────────────────────────────┘   │
│ [📋 Text mẫu] [🔄 Random]                                  │
│                                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│ [🔊 NGHE THỬ TTS]                                          │
│                                                             │
│ [▶️ Play] [⏸️ Pause] [⏹️ Stop] [🔁 Repeat]                 │
│                                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│ Thông tin audio:                                           │
│ • Duration: ~3.2 seconds                                   │
│ • Estimated size: ~51 KB                                   │
│ • Estimated cost: $0.0008                                  │
│                                                             │
│ [💾 Lưu làm preset] [📊 So sánh giọng]                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

#### 4. Voice Comparison Modal

```
┌─────────────────────────────────────────────────────────────┐
│ 🎵 SO SÁNH GIỌNG ĐỌC                               [✖️]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Văn bản so sánh:                                            │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ The quick brown fox jumps over the lazy dog.        │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌─────────────────┬─────────────────┬─────────────────┐   │
│ │ Giọng 1         │ Giọng 2         │ Giọng 3         │   │
│ ├─────────────────┼─────────────────┼─────────────────┤   │
│ │ [en-US-Neural2-D│ [en-US-Wavenet-B│ [en-GB-Neural2-A│   │
│ │ Nam • Neural2   │ Nam • WaveNet   │ Nữ • Neural2    │   │
│ ├─────────────────┼─────────────────┼─────────────────┤   │
│ │ [▶️ Play]       │ [▶️ Play]       │ [▶️ Play]       │   │
│ │ [⏹️ Stop]       │ [⏹️ Stop]       │ [⏹️ Stop]       │   │
│ ├─────────────────┼─────────────────┼─────────────────┤   │
│ │ Duration: 3.2s  │ Duration: 3.4s  │ Duration: 3.1s  │   │
│ │ Size: 51 KB     │ Size: 54 KB     │ Size: 49 KB     │   │
│ │ Cost: $0.0008   │ Cost: $0.0008   │ Cost: $0.0008   │   │
│ │                 │                 │                 │   │
│ │ [🔊 Download]   │ [🔊 Download]   │ [🔊 Download]   │   │
│ └─────────────────┴─────────────────┴─────────────────┘   │
│                                                             │
│ [▶️ Play all] [⏹️ Stop all] [ Compare again]             │
│                                                             │
│ Đánh giá (chọn giọng tốt nhất):                            │
│ ○ Giọng 1  ○ Giọng 2  ○ Giọng 3  ○ Equal                  │
│                                                             │
│ [💾 Lưu kết quả] [📤 Export report] [✖️ Close]             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

#### 5. Statistics Dashboard Tab

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 THỐNG KÊ TTS                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Period: [Last 7 days ▼] [Custom range]                     │
│                                                             │
│ ┌──────────────┬──────────────┬──────────────┬──────────┐ │
│ │ Tổng requests│ Cache hit    │ Total chars  │ Cost     │ │
│ │ 12,456       │ rate         │ 1,234,567    │ $19.75   │ │
│ │ ↑ 12%        │ 94.3%        │ ↑ 8%         │ ↑ 5%     │ │
│ │              │ ↑ 2.1%       │              │          │ │
│ └──────────────┴──────────────┴──────────────┴──────────┘ │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ Requests over time                                    │ │
│ │ [Line chart: Daily requests]                          │ │
│ │                                                       │ │
│ └───────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────┐ ┌─────────────────────────────┐   │
│ │ Top languages       │ │ Voice usage distribution    │   │
│ │ 1. en-US (45%)      │ │ [Pie chart]                 │   │
│ │ 2. vi-VN (23%)      │ │ • Neural2: 60%              │   │
│ │ 3. en-GB (15%)      │ │ • WaveNet: 30%              │   │
│ │ 4. ja-JP (10%)      │ │ • Standard: 10%             │   │
│ │ 5. Other (7%)       │ │                             │   │
│ └─────────────────────┘ └─────────────────────────────┘   │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ Cost breakdown                                        │ │
│ │ [Bar chart: Cost per language]                        │ │
│ │                                                       │ │
│ └───────────────────────────────────────────────────────┘ │
│                                                             │
│ [📥 Export report] [📧 Email weekly] [⚙️ Configure alerts] │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 🎨 COLOR SCHEME & DESIGN TOKENS

```typescript
const DESIGN_TOKENS = {
  colors: {
    primary: {
      main: '#6366F1',    // Indigo 500
      light: '#818CF8',   // Indigo 400
      dark: '#4F46E5',    // Indigo 600
    },
    secondary: {
      main: '#F59E0B',    // Amber 500
      light: '#FBBF24',   // Amber 400
      dark: '#D97706',    // Amber 600
    },
    success: '#10B981',   // Emerald 500
    warning: '#F59E0B',   // Amber 500
    error: '#EF4444',     // Red 500
    info: '#3B82F6',      // Blue 500
    
    voiceTypes: {
      Standard: '#6B7280', // Gray 500
      WaveNet: '#3B82F6',  // Blue 500
      Neural2: '#8B5CF6',  // Violet 500
      Studio: '#F59E0B',   // Amber 500
    },
    
    gender: {
      Male: '#3B82F6',     // Blue 500
      Female: '#EC4899',   // Pink 500
      Neutral: '#6B7280',  // Gray 500
    },
    
    background: {
      primary: '#F9FAFB',   // Gray 50
      secondary: '#FFFFFF', // White
      card: '#FFFFFF',      // White
    },
    
    text: {
      primary: '#111827',   // Gray 900
      secondary: '#6B7280', // Gray 500
      muted: '#9CA3AF',     // Gray 400
    }
  },
  
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
  },
  
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  }
};
```

---

### 📱 RESPONSIVE BREAKPOINTS

```typescript
const BREAKPOINTS = {
  mobile: '320px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1280px',
};

const RESPONSIVE_BEHAVIOR = {
  mobile: {
    table: 'Card view (stacked)',
    sidebar: 'Hidden (hamburger menu)',
    previewPanel: 'Bottom sheet (slide up)',
    form: 'Single column',
  },
  tablet: {
    table: 'Horizontal scroll',
    sidebar: 'Collapsed icons',
    previewPanel: 'Right side (collapsible)',
    form: 'Two columns',
  },
  desktop: {
    table: 'Full view',
    sidebar: 'Expanded',
    previewPanel: 'Right side (fixed 400px)',
    form: 'Two columns',
  },
};
```

---

## 🎯 PHẦN 3: PROMPTS CHO CLAUDE CODE

### Prompt 1: Setup Project Structure

```
Tôi đang xây dựng trang admin cấu hình Google Cloud TTS cho MemoryLang.

Yêu cầu:
1. Tạo folder structure cho TTS admin module
2. Setup TypeScript interfaces cho tất cả config types
3. Tạo constants files cho languages, voices, audio configs
4. Setup API routes structure (Express/Next.js)
5. Tạo utility functions cho cost estimation, cache management

Tech stack:
- Frontend: React + TypeScript + TailwindCSS
- Backend: Node.js + Express (hoặc Next.js API routes)
- Database: Supabase (PostgreSQL)
- Storage: Cloudflare R2
- TTS: Google Cloud Text-to-Speech

Hãy tạo cấu trúc folder và các file base cần thiết.
```

### Prompt 2: Create Database Schema

```
Tạo database schema cho TTS configuration system trên Supabase.

Tables cần thiết:
1. tts_configurations (lưu config cho từng ngôn ngữ)
   - id, language_code, voice_name, voice_type, gender
   - speaking_rate, pitch, volume_gain_db
   - audio_encoding, sample_rate_hertz
   - effects_profile_id
   - is_default, is_active
   - created_at, updated_at

2. tts_cache_stats (thống kê cache)
   - id, configuration_id
   - total_requests, cache_hits, cache_misses
   - hit_rate_percentage
   - total_size_bytes
   - last_cached_at

3. tts_usage_logs (log usage)
   - id, configuration_id, user_id
   - text_content, text_length
   - audio_url, duration_seconds
   - cost_usd, cached
   - created_at

4. tts_cost_tracking (theo dõi chi phí)
   - id, month, year
   - total_characters, total_cost
   - free_tier_used, paid_characters
   - breakdown_by_voice_type (JSON)

Yêu cầu:
- Tạo SQL migration files
- Thêm indexes cho performance
- Thêm Row Level Security (RLS) policies
- Thêm sample data
```

### Prompt 3: Build API Endpoints

```
Tạo các API endpoints cho TTS admin:

1. GET /api/tts/configurations
   - List all configurations
   - Query params: page, limit, filter, sort
   - Include: usage stats, cache stats

2. POST /api/tts/configurations
   - Create new configuration
   - Validate input
   - Check duplicates

3. PUT /api/tts/configurations/:id
   - Update configuration
   - Invalidate cache if needed
   - Log changes

4. DELETE /api/tts/configurations/:id
   - Soft delete
   - Clean up related data

5. POST /api/tts/preview
   - Generate preview audio
   - Return base64 or temp URL
   - Don't cache preview

6. POST /api/tts/synthesize
   - Main TTS endpoint
   - Check cache first
   - Call Google TTS if cache miss
   - Upload to R2
   - Return audio URL

7. GET /api/tts/voices
   - List available voices from Google
   - Cache response

8. GET /api/tts/stats
   - Dashboard statistics
   - Date range filter
   - Group by language/voice

9. POST /api/tts/cache/clear
   - Clear cache for specific config
   - Or clear all cache

10. GET /api/tts/cost/estimate
    - Estimate cost based on usage
    - Include free tier calculation

Yêu cầu:
- Use async/await
- Error handling with try-catch
- Input validation (Zod or Joi)
- Rate limiting
- Authentication middleware
- Logging
```

### Prompt 4: Build React Components

```
Tạo React components cho TTS admin page:

Components cần thiết:

1. TTSConfigPage (main page)
   - Layout with sidebar
   - Tab navigation
   - Main content area

2. ConfigurationTable
   - Sortable columns
   - Filter/search
   - Pagination
   - Row actions (edit, delete, preview)
   - Bulk selection

3. ConfigurationForm
   - Multi-step form or sections
   - Voice selection dropdown
   - Sliders for rate/pitch/volume
   - Audio encoding selector
   - SSML editor (optional)
   - Save/cancel buttons

4. PreviewPanel
   - Language selector
   - Voice selector
   - Quick config sliders
   - Text input area
   - Audio player
   - Play/stop controls

5. VoiceComparisonModal
   - Select 2-3 voices
   - Side-by-side comparison
   - Play controls for each
   - Rating system

6. StatsDashboard
   - KPI cards
   - Charts (line, pie, bar)
   - Date range picker
   - Export functionality

7. CacheManagementPanel
   - Cache stats
   - Clear cache button
   - Configuration options

8. CostEstimatorWidget
   - Real-time cost calculation
   - Free tier indicator
   - Projection chart

Shared components:
- VoiceSelector (reusable dropdown)
- AudioPlayer (custom player)
- Slider (custom range input)
- Badge (for status/tags)
- Card (layout wrapper)

Yêu cầu:
- Use TypeScript
- Functional components with hooks
- TailwindCSS for styling
- Responsive design
- Accessibility (ARIA labels)
- Loading states
- Error boundaries
```

### Prompt 5: Implement Google TTS Integration

```
Tạo service layer để tích hợp Google Cloud TTS:

Files cần tạo:

1. services/googleTts.ts
   - initializeTTSClient()
   - listVoices()
   - synthesizeSpeech(text, config)
   - validateConfig(config)
   - estimateCost(text, voiceType)

2. services/cloudflareR2.ts
   - initializeR2Client()
   - uploadAudio(key, buffer, metadata)
   - getAudioUrl(key, expiresIn)
   - deleteAudio(key)
   - listAudios(prefix)

3. services/cacheManager.ts
   - checkCache(textHash, voiceConfig)
   - saveToCache(textHash, voiceConfig, audioUrl)
   - invalidateCache(configId)
   - clearAllCache()
   - getCacheStats()

4. utils/textHash.ts
   - generateHash(text, config)
   - Consistent hashing algorithm

5. utils/costCalculator.ts
   - calculateCost(charCount, voiceType)
   - applyFreeTier(usage, voiceType)
   - getMonthlyEstimate(currentUsage)

6. utils/ssmlBuilder.ts
   - buildSSML(text, options)
   - addBreak(time)
   - addEmphasis(text, level)
   - addProsody(text, rate, pitch)
   - validateSSML(ssml)

Yêu cầu:
- Type-safe
- Error handling
- Retry logic for API calls
- Logging
- Unit tests
```

### Prompt 6: Add Real-time Features

```
Thêm real-time features cho TTS admin:

1. WebSocket setup
   - Real-time usage updates
   - Live cost tracking
   - Cache hit/miss notifications

2. Background jobs
   - Daily cost calculation
   - Cache cleanup (old files)
   - Usage aggregation
   - Alert notifications

3. Notifications system
   - Cost threshold alerts
   - Cache miss rate alerts
   - API quota warnings

4. Real-time dashboard
   - Live request counter
   - Active users
   - Current cost (this month)
   - Cache performance

Yêu cầu:
- Use Socket.io or Supabase Realtime
- Bull/BullMQ for jobs
- Redis for job queue
- Cron jobs for scheduled tasks
```

---

## 📚 TÀI LIỆU THAM KHẢO

### Google Cloud TTS Documentation
- Official docs: https://cloud.google.com/text-to-speech/docs
- Voice list: https://cloud.google.com/text-to-speech/docs/voices
- SSML support: https://cloud.google.com/text-to-speech/docs/ssml
- Pricing: https://cloud.google.com/text-to-speech/pricing

### Cloudflare R2 Documentation
- Getting started: https://developers.cloudflare.com/r2/
- API docs: https://developers.cloudflare.com/r2/api/
- Pricing: https://developers.cloudflare.com/r2/pricing/

### Supabase Documentation
- Database: https://supabase.com/docs/guides/database
- Storage: https://supabase.com/docs/guides/storage
- Realtime: https://supabase.com/docs/guides/realtime

### Best Practices
- Caching strategies for TTS
- Cost optimization techniques
- Performance tuning
- Security best practices

---

## ✅ CHECKLIST TRIỂN KHAI

### Phase 1: Setup (Week 1)
- [ ] Setup Google Cloud TTS account & billing
- [ ] Setup Cloudflare R2 bucket
- [ ] Setup Supabase database & tables
- [ ] Create project structure
- [ ] Setup environment variables
- [ ] Install dependencies

### Phase 2: Backend API (Week 2)
- [ ] Implement Google TTS service
- [ ] Implement Cloudflare R2 service
- [ ] Implement cache manager
- [ ] Create API endpoints
- [ ] Add authentication & authorization
- [ ] Add error handling & logging
- [ ] Write unit tests

### Phase 3: Frontend UI (Week 3)
- [ ] Create main layout
- [ ] Build configuration table
- [ ] Build configuration form
- [ ] Build preview panel
- [ ] Build voice comparison modal
- [ ] Build stats dashboard
- [ ] Add responsive design
- [ ] Add loading & error states

### Phase 4: Integration (Week 4)
- [ ] Connect frontend to backend
- [ ] Implement real-time updates
- [ ] Add file upload/download
- [ ] Implement cache invalidation
- [ ] Add cost tracking
- [ ] Add analytics

### Phase 5: Testing & Optimization (Week 5)
- [ ] End-to-end testing
- [ ] Performance testing
- [ ] Security audit
- [ ] Cost optimization
- [ ] User acceptance testing
- [ ] Bug fixes

### Phase 6: Deployment (Week 6)
- [ ] Setup production environment
- [ ] Configure CI/CD
- [ ] Setup monitoring & alerts
- [ ] Database migration
- [ ] Deploy to production
- [ ] Documentation
- [ ] Training

---

## 🎓 HƯỚNG DẪN SỬ DỤNG CLAUDE CODE

### Cách sử dụng hiệu quả:

1. **Copy từng prompt** trong phần 3
2. **Paste vào Claude Code** trong VSCode
3. **Review code** được tạo ra
4. **Yêu cầu chỉnh sửa** nếu cần (ví dụ: "Thay đổi màu sắc", "Thêm validation")
5. **Test từng component** trước khi qua component tiếp theo

### Tips:
- Bắt đầu với database schema trước
- Sau đó làm backend API
- Rồi mới đến frontend UI
- Test kỹ từng phần

### Khi gặp lỗi:
- Copy error message vào Claude
- Hỏi "Fix lỗi này: [error message]"
- Claude sẽ suggest cách sửa

---

## 📞 SUPPORT

Nếu cần hỗ trợ thêm:
- Check Google Cloud TTS docs
- Check Cloudflare R2 docs
- Ask Claude Code với context cụ thể
- Review error logs

---

**Good luck with MemoryLang! 🚀**

File được tạo ngày: 2026-06-26  
Version: 1.0.0  
Author: MemoryLang Team
```

File markdown này đã sẵn sàng! Bạn có thể lưu thành file `TTS_ADMIN_IMPLEMENTATION_PLAN.md` và sử dụng với VSCode + Claude Code để triển khai từng phần.

File này bao gồm:
✅ **Danh sách đầy đủ** tất cả cấu hình Google Cloud TTS có thể tùy chỉnh
✅ **Thiết kế UI chi tiết** với wireframes và component specs
✅ **Prompts sẵn sàng** cho Claude Code để implement
✅ **Database schema** cho Supabase
✅ **API endpoints** specification
✅ **TypeScript interfaces** và constants
✅ **Checklist triển khai** theo từng phase

Chúc bạn triển khai thành công trang admin TTS cho MemoryLang! 🎉