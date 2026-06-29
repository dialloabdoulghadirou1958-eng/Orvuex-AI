import * as icons from 'simple-icons';
const keys = Object.keys(icons);
console.log('OpenAI:', keys.find(k => k.toLowerCase().includes('open')));
console.log('Mistral:', keys.find(k => k.toLowerCase().includes('mistral')));
console.log('Gemini:', keys.find(k => k.toLowerCase().includes('gemini')));
console.log('Groq:', keys.find(k => k.toLowerCase().includes('groq')));
console.log('DeepSeek:', keys.find(k => k.toLowerCase().includes('deep')));
console.log('Cerebras:', keys.find(k => k.toLowerCase().includes('cerebras')));
