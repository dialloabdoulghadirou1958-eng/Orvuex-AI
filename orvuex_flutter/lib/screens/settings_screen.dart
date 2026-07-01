import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/settings_provider.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final settings = Provider.of<SettingsProvider>(context);
    
    return Scaffold(
      appBar: AppBar(title: const Text('Paramètres')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Fournisseur IA', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            DropdownButton<String>(
              value: settings.selectedProvider,
              isExpanded: true,
              items: const [
                DropdownMenuItem(value: 'openai', child: Text('OpenAI')),
                DropdownMenuItem(value: 'groq', child: Text('Groq')),
                DropdownMenuItem(value: 'deepseek', child: Text('DeepSeek')),
                DropdownMenuItem(value: 'mistral', child: Text('Mistral')),
                DropdownMenuItem(value: 'openrouter', child: Text('OpenRouter')),
                DropdownMenuItem(value: 'gemini', child: Text('Google Gemini')),
              ],
              onChanged: (val) {
                if (val != null) settings.setProvider(val);
              },
            ),
            const SizedBox(height: 24),
            const Text('Clé API', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            TextField(
              obscureText: true,
              decoration: const InputDecoration(
                hintText: 'Entrez votre clé API...',
              ),
              onChanged: (val) => settings.setApiKey(val),
              controller: TextEditingController(text: settings.apiKey)..selection = TextSelection.collapsed(offset: settings.apiKey.length),
            ),
            const SizedBox(height: 16),
            const Text(
              'Vos clés sont stockées localement sur votre appareil.',
              style: TextStyle(color: Colors.grey, fontSize: 12),
            )
          ],
        ),
      ),
    );
  }
}
