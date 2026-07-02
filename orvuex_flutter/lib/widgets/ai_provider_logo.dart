import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

class AiProviderInfo {
  final String id;
  final String name;
  final String svgUrl;
  final Color brandColor;

  const AiProviderInfo({
    required this.id,
    required this.name,
    required this.svgUrl,
    required this.brandColor,
  });

  static const List<AiProviderInfo> all = [
    AiProviderInfo(
      id: 'gemini',
      name: 'Google Gemini',
      svgUrl: 'https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/googlegemini.svg',
      brandColor: Color(0xFF1A73E8),
    ),
    AiProviderInfo(
      id: 'openai',
      name: 'OpenAI',
      svgUrl: 'https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/openai.svg',
      brandColor: Color(0xFF10A37F),
    ),
    AiProviderInfo(
      id: 'deepseek',
      name: 'DeepSeek',
      svgUrl: 'https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/deepseek.svg',
      brandColor: Color(0xFF0037FF),
    ),
    AiProviderInfo(
      id: 'mistral',
      name: 'Mistral AI',
      svgUrl: 'https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/mistral.svg',
      brandColor: Color(0xFFFF5E00),
    ),
    AiProviderInfo(
      id: 'groq',
      name: 'Groq',
      svgUrl: 'https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/groq.svg',
      brandColor: Color(0xFFF55036),
    ),
    AiProviderInfo(
      id: 'openrouter',
      name: 'OpenRouter',
      svgUrl: 'https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/openrouter.svg',
      brandColor: Color(0xFF7E57C2),
    ),
  ];

  static AiProviderInfo getById(String id) {
    return all.firstWhere(
      (p) => p.id == id,
      orElse: () => const AiProviderInfo(
        id: 'generic',
        name: 'AI Assistant',
        svgUrl: 'https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/openai.svg',
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
    final targetColor = color ?? (useBrandColor ? provider.brandColor : Colors.white);

    return SvgPicture.network(
      provider.svgUrl,
      width: size,
      height: size,
      fit: BoxFit.contain,
      colorFilter: ColorFilter.mode(targetColor, BlendMode.srcIn),
      placeholderBuilder: (BuildContext context) => SizedBox(
        width: size,
        height: size,
        child: Padding(
          padding: const EdgeInsets.all(4.0),
          child: CircularProgressIndicator(
            strokeWidth: 1.5,
            valueColor: AlwaysStoppedAnimation<Color>(targetColor.withOpacity(0.5)),
          ),
        ),
      ),
    );
  }
}

