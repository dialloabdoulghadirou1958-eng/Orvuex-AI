import 'dart:convert';
import 'package:http/http.dart' as http;

class ChatService {
  static Stream<String> sendMessageStream(String message, String apiKey, String provider) async* {
    if (apiKey.isEmpty) {
      throw Exception('API Key is missing');
    }

    String url = '';
    String model = '';
    
    switch (provider) {
      case 'openai':
        url = 'https://api.openai.com/v1/chat/completions';
        model = 'gpt-4o';
        break;
      case 'groq':
        url = 'https://api.groq.com/openai/v1/chat/completions';
        model = 'llama3-8b-8192';
        break;
      case 'deepseek':
        url = 'https://api.deepseek.com/chat/completions';
        model = 'deepseek-chat';
        break;
      case 'mistral':
        url = 'https://api.mistral.ai/v1/chat/completions';
        model = 'mistral-large-latest';
        break;
      case 'openrouter':
        url = 'https://openrouter.ai/api/v1/chat/completions';
        model = 'google/gemini-pro';
        break;
      case 'gemini':
        url = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
        model = 'gemini-1.5-pro-latest';
        break;
      default:
        url = 'https://api.openai.com/v1/chat/completions';
        model = 'gpt-3.5-turbo';
    }

    final request = http.Request('POST', Uri.parse(url));
    request.headers.addAll({
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $apiKey',
    });
    
    request.body = jsonEncode({
      'model': model,
      'messages': [{'role': 'user', 'content': message}],
      'stream': true,
    });

    final response = await http.Client().send(request);

    if (response.statusCode != 200) {
      throw Exception('Failed to connect: ${response.statusCode}');
    }

    await for (var chunk in response.stream.transform(utf8.decoder)) {
      final lines = chunk.split('\n');
      for (var line in lines) {
        if (line.startsWith('data: ') && line != 'data: [DONE]') {
          try {
            final data = jsonDecode(line.substring(6));
            final content = data['choices'][0]['delta']['content'];
            if (content != null) {
              yield content;
            }
          } catch (e) {
            // Error parsing chunk
          }
        }
      }
    }
  }
}
