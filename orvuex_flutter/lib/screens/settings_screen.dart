import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/settings_provider.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  DropdownMenuItem<String> _buildProviderItem(String value, String label, String iconPath) {
    return DropdownMenuItem(
      value: value,
      child: Row(
        children: [
          Image.asset(
            iconPath, 
            width: 24, 
            height: 24,
            errorBuilder: (context, error, stackTrace) => const Icon(Icons.smart_toy, size: 24, color: Colors.blueAccent),
          ),
          const SizedBox(width: 12),
          Text(label),
        ],
      ),
    );
  }

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
              items: [
                _buildProviderItem('openai', 'OpenAI', 'assets/icons/openai.png'),
                _buildProviderItem('groq', 'Groq', 'assets/icons/groq.png'),
                _buildProviderItem('deepseek', 'DeepSeek', 'assets/icons/deepseek.png'),
                _buildProviderItem('mistral', 'Mistral', 'assets/icons/mistral.png'),
                _buildProviderItem('openrouter', 'OpenRouter', 'assets/icons/openrouter.png'),
                _buildProviderItem('gemini', 'Google Gemini', 'assets/icons/gemini.png'),
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
