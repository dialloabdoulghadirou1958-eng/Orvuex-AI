import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

class AiProviderLogoWidget extends StatelessWidget {
  final String imageUrl;
  final String providerName;
  final double size;

  const AiProviderLogoWidget({
    super.key,
    required this.imageUrl,
    required this.providerName,
    this.size = 24.0,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        SvgPicture.network(
          imageUrl,
          width: size,
          height: size,
          fit: BoxFit.contain,
          placeholderBuilder: (BuildContext context) => Container(
            width: size,
            height: size,
            padding: const EdgeInsets.all(4.0),
            child: const CircularProgressIndicator(strokeWidth: 2.0),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          providerName,
          style: const TextStyle(fontWeight: FontWeight.w500),
        ),
      ],
    );
  }
}
