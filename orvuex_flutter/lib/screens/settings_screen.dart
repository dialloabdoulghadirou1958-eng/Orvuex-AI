import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/settings_provider.dart';
import '../widgets/ai_provider_logo.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _obscureApiKey = true;

  @override
  Widget build(BuildContext context) {
    final settings = Provider.of<SettingsProvider>(context);

    final List<Map<String, String>> providers = [
      {'id': 'gemini', 'name': 'Google Gemini', 'icon': 'assets/icons/gemini.png'},
      {'id': 'openai', 'name': 'OpenAI', 'icon': 'assets/icons/openai.png'},
      {'id': 'deepseek', 'name': 'DeepSeek', 'icon': 'assets/icons/deepseek.png'},
      {'id': 'mistral', 'name': 'Mistral AI', 'icon': 'assets/icons/mistral.png'},
      {'id': 'groq', 'name': 'Groq', 'icon': 'assets/icons/groq.png'},
      {'id': 'openrouter', 'name': 'OpenRouter', 'icon': 'assets/icons/openrouter.png'},
    ];

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Paramètres',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 20,
          ),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.only(left: 20.0, right: 20.0, top: 12.0, bottom: 32.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Title for providers section
            const Text(
              'FOURNISSEURS D\'IA',
              style: TextStyle(
                color: Colors.grey,
                fontSize: 12,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.5,
              ),
            ),
            const SizedBox(height: 12),

            // Horizontal list of provider cards
            SizedBox(
              height: 115,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                itemCount: providers.length,
                itemBuilder: (context, index) {
                  final prov = providers[index];
                  final String id = prov['id']!;
                  final String name = prov['name']!;
                  final String iconPath = prov['icon']!;
                  final bool isSelected = settings.selectedProvider == id;

                  return GestureDetector(
                    onTap: () => settings.setProvider(id),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      width: 115,
                      margin: EdgeInsets.only(
                        right: index == providers.length - 1 ? 0 : 12,
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
                      decoration: BoxDecoration(
                        color: isSelected ? const Color(0xFF1E1E1E) : const Color(0xFF0F0F11),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isSelected 
                              ? Colors.white.withOpacity(0.35) 
                              : Colors.white.withOpacity(0.06),
                          width: 1.5,
                        ),
                        boxShadow: isSelected ? [
                          BoxShadow(
                            color: Colors.white.withOpacity(0.05),
                            blurRadius: 10,
                            spreadRadius: 1,
                          )
                        ] : [],
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          AiProviderLogoWidget(
                            providerId: id,
                            size: 32,
                          ),
                          const SizedBox(height: 10),
                          Text(
                            name,
                            textAlign: TextAlign.center,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: isSelected ? Colors.white : Colors.white.withOpacity(0.55),
                              fontSize: 12,
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),

            const SizedBox(height: 28),

            // Active Model section
            const Text(
              'MODÈLE ACTIF',
              style: TextStyle(
                color: Colors.grey,
                fontSize: 12,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.5,
              ),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFF1E1E1E),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white.withOpacity(0.06)),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButtonFormField<String>(
                  value: settings.selectedModel,
                  dropdownColor: const Color(0xFF1E1E1E),
                  isExpanded: true,
                  icon: const Icon(Icons.keyboard_arrow_down, color: Colors.grey),
                  style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w500),
                  decoration: const InputDecoration(
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.zero,
                  ),
                  items: SettingsProvider.modelsFor(settings.selectedProvider).map((model) {
                    return DropdownMenuItem<String>(
                      value: model,
                      child: Text(
                        model,
                        style: const TextStyle(color: Colors.white),
                      ),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) settings.setModel(val);
                  },
                ),
              ),
            ),

            const SizedBox(height: 28),

            // API Key section
            const Text(
              'CLÉ API',
              style: TextStyle(
                color: Colors.grey,
                fontSize: 12,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.5,
              ),
            ),
            const SizedBox(height: 12),
            Container(
              decoration: BoxDecoration(
                color: const Color(0xFF1E1E1E),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white.withOpacity(0.06)),
              ),
              child: TextField(
                obscureText: _obscureApiKey,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  hintText: 'Entrez votre clé API...',
                  hintStyle: TextStyle(color: Colors.white.withOpacity(0.3), fontSize: 15),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscureApiKey ? Icons.visibility_off : Icons.visibility,
                      color: Colors.white.withOpacity(0.4),
                    ),
                    onPressed: () {
                      setState(() {
                        _obscureApiKey = !_obscureApiKey;
                      });
                    },
                  ),
                ),
                onChanged: (val) => settings.setApiKey(val),
                controller: TextEditingController(text: settings.apiKey)
                  ..selection = TextSelection.collapsed(offset: settings.apiKey.length),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Icon(Icons.lock_outline_rounded, color: Colors.white.withOpacity(0.3), size: 14),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'Vos clés sont stockées localement sur votre appareil.',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.35),
                      fontSize: 12,
                      fontWeight: FontWeight.w400,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

