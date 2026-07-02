import 'package:flutter/material.dart';

class AiProviderInfo {
  final String id;
  final String name;
  final String assetPath;
  final Color brandColor;

  const AiProviderInfo({
    required this.id,
    required this.name,
    required this.assetPath,
    required this.brandColor,
  });

  static const List<AiProviderInfo> all = [
    AiProviderInfo(
      id: 'gemini',
      name: 'Google Gemini',
      assetPath: 'assets/icons/gemini.png',
      brandColor: Color(0xFF1A73E8),
    ),
    AiProviderInfo(
      id: 'openai',
      name: 'OpenAI',
      assetPath: 'assets/icons/openai.png',
      brandColor: Color(0xFF10A37F),
    ),
    AiProviderInfo(
      id: 'deepseek',
      name: 'DeepSeek',
      assetPath: 'assets/icons/deepseek.png',
      brandColor: Color(0xFF0037FF),
    ),
    AiProviderInfo(
      id: 'mistral',
      name: 'Mistral AI',
      assetPath: 'assets/icons/mistral.png',
      brandColor: Color(0xFFFF5E00),
    ),
    AiProviderInfo(
      id: 'groq',
      name: 'Groq',
      assetPath: 'assets/icons/groq.png',
      brandColor: Color(0xFFF55036),
    ),
    AiProviderInfo(
      id: 'openrouter',
      name: 'OpenRouter',
      assetPath: 'assets/icons/openrouter.png',
      brandColor: Color(0xFF7E57C2),
    ),
  ];

  static AiProviderInfo getById(String id) {
    return all.firstWhere(
      (p) => p.id == id,
      orElse: () => const AiProviderInfo(
        id: 'generic',
        name: 'AI Assistant',
        assetPath: 'assets/icons/openai.png',
        brandColor: Colors.white,
      ),
    );
  }
}

class AiProviderLogoWidget extends StatelessWidget {
  final String providerId;
  final double size;
  final Color? color;
  final bool useBrandColor;

  const AiProviderLogoWidget({
    super.key,
    required this.providerId,
    this.size = 24.0,
    this.color,
    this.useBrandColor = true,
  });

  @override
  Widget build(BuildContext context) {
    final provider = AiProviderInfo.getById(providerId);

    return Image.asset(
      provider.assetPath,
      width: size,
      height: size,
      fit: BoxFit.contain,
      color: color,
      errorBuilder: (context, error, stackTrace) {
        return Icon(
          Icons.smart_toy_outlined,
          size: size,
          color: color ?? Colors.grey,
        );
      },
    );
  }
}

