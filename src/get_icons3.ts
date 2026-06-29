import * as icons from 'simple-icons';
const keys = Object.keys(icons);
console.log('Open:', keys.filter(k => k.toLowerCase().includes('openai') || k.toLowerCase().includes('openrouter')));
console.log('Mistral:', keys.filter(k => k.toLowerCase().includes('mistral')));
console.log('DeepSeek:', keys.filter(k => k.toLowerCase().includes('deepseek')));
console.log('Groq:', keys.filter(k => k.toLowerCase().includes('groq')));
console.log('Cerebras:', keys.filter(k => k.toLowerCase().includes('cerebras')));
