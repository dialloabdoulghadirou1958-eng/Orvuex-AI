import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/settings_provider.dart';
import '../services/chat_provider.dart';
import '../services/chat_service.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'settings_screen.dart';
import '../widgets/history_drawer.dart';
import 'live_voice_screen.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _isLoading = false;

  void _sendMessage() async {
    final text = _controller.text.trim();
    if (text.isEmpty) return;

    final settings = Provider.of<SettingsProvider>(context, listen: false);
    final chatProvider = Provider.of<ChatProvider>(context, listen: false);

    if (settings.apiKey.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez configurer votre clé API dans les paramètres.')),
      );
      return;
    }

    // Add User Message
    chatProvider.addMessage('user', text);
    _controller.clear();
    _scrollToBottom();
    
    // Add empty Assistant Message to be streamed into
    chatProvider.addMessage('assistant', '');

    setState(() {
      _isLoading = true;
    });

    try {
      final stream = ChatService.sendMessageStream(
        text, 
        settings.apiKey, 
        settings.selectedProvider,
        model: settings.selectedModel,
      );
      await for (final chunk in stream) {
        chatProvider.appendToLastMessage(chunk);
        _scrollToBottom();
      }
    } catch (e) {
      chatProvider.appendToLastMessage('\n\n**Erreur:** ${e.toString()}');
    } finally {
      setState(() {
        _isLoading = false;
      });
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Widget _buildProviderChip(SettingsProvider settings) {
    String displayName = 'OpenAI';
    switch (settings.selectedProvider) {
      case 'openai': displayName = 'OpenAI'; break;
      case 'groq': displayName = 'Groq'; break;
      case 'deepseek': displayName = 'DeepSeek'; break;
      case 'mistral': displayName = 'Mistral'; break;
      case 'openrouter': displayName = 'OpenRouter'; break;
      case 'gemini': displayName = 'Google...'; break;
    }
    
    return PopupMenuButton<String>(
      initialValue: settings.selectedProvider,
      onSelected: (String provider) {
        settings.setProvider(provider);
      },
      itemBuilder: (BuildContext context) => <PopupMenuEntry<String>>[
        const PopupMenuItem<String>(value: 'openai', child: Text('OpenAI')),
        const PopupMenuItem<String>(value: 'groq', child: Text('Groq')),
        const PopupMenuItem<String>(value: 'deepseek', child: Text('DeepSeek')),
        const PopupMenuItem<String>(value: 'mistral', child: Text('Mistral')),
        const PopupMenuItem<String>(value: 'openrouter', child: Text('OpenRouter')),
        const PopupMenuItem<String>(value: 'gemini', child: Text('Google Gemini')),
      ],
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xFF161618),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white10),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (settings.selectedProvider == 'gemini') ...[
              const Icon(Icons.stars, color: Colors.cyanAccent, size: 14),
              const SizedBox(width: 6),
            ] else ...[
              const Icon(Icons.auto_awesome, color: Colors.white54, size: 14),
              const SizedBox(width: 6),
            ],
            Text(
              displayName,
              style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500),
            ),
            const SizedBox(width: 4),
            const Icon(Icons.keyboard_arrow_down, color: Colors.white60, size: 14),
          ],
        ),
      ),
    );
  }

  Widget _buildModelChip(SettingsProvider settings) {
    final providerModels = SettingsProvider.modelsFor(settings.selectedProvider);
    String activeModel = settings.selectedModel;
    
    // Display name logic to match screenshot
    String displayName = activeModel;
    if (settings.selectedProvider == 'gemini') {
      displayName = 'Gemini...';
    } else if (activeModel.length > 12) {
      displayName = '${activeModel.substring(0, 10)}...';
    }

    return PopupMenuButton<String>(
      initialValue: activeModel,
      onSelected: (String model) {
        settings.setModel(model);
      },
      itemBuilder: (BuildContext context) => providerModels
          .map((m) => PopupMenuItem<String>(
                value: m,
                child: Text(m),
              ))
          .toList(),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xFF161618),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white10),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              displayName,
              style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500),
            ),
            const SizedBox(width: 4),
            const Icon(Icons.keyboard_arrow_down, color: Colors.white60, size: 14),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final settings = Provider.of<SettingsProvider>(context);
    
    return Scaffold(
      backgroundColor: Colors.black,
      drawer: const HistoryDrawer(),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: Builder(
          builder: (context) => IconButton(
            icon: const Icon(Icons.menu, color: Colors.white70),
            onPressed: () => Scaffold.of(context).openDrawer(),
          ),
        ),
        actions: [
          Consumer<ChatProvider>(
            builder: (context, chatProvider, _) => IconButton(
              icon: const Icon(Icons.edit_square, color: Colors.white70),
              onPressed: () {
                chatProvider.createNewSession();
              },
            ),
          ),
          IconButton(
            icon: const Icon(Icons.settings, color: Colors.white70),
            onPressed: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const SettingsScreen()));
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Consumer<ChatProvider>(
        builder: (context, chatProvider, child) {
          final activeSession = chatProvider.activeSession;
          final messages = activeSession?.messages ?? [];

          return Column(
            children: [
              Expanded(
                child: messages.isEmpty
                    ? SingleChildScrollView(
                        child: Container(
                          height: MediaQuery.of(context).size.height * 0.70,
                          alignment: Alignment.center,
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              // Swirl Logo with Glowing Back-shadows
                              Container(
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.purpleAccent.withOpacity(0.15),
                                      blurRadius: 50,
                                      spreadRadius: 15,
                                    ),
                                    BoxShadow(
                                      color: Colors.cyanAccent.withOpacity(0.1),
                                      blurRadius: 40,
                                      spreadRadius: 5,
                                    ),
                                  ],
                                ),
                                child: Image.asset(
                                  'assets/images/orvuex_logo.png',
                                  width: 150,
                                  height: 150,
                                  fit: BoxFit.contain,
                                  errorBuilder: (context, error, stackTrace) {
                                    // Fallback SVG-like or simple circular custom representation
                                    return Container(
                                      width: 150,
                                      height: 150,
                                      decoration: const BoxDecoration(
                                        shape: BoxShape.circle,
                                        gradient: LinearGradient(
                                          colors: [Colors.purple, Colors.blue, Colors.cyan],
                                          begin: Alignment.topLeft,
                                          end: Alignment.bottomRight,
                                        ),
                                      ),
                                      child: const Icon(Icons.auto_awesome, size: 70, color: Colors.white),
                                    );
                                  },
                                ),
                              ),
                              const SizedBox(height: 16),
                              // Title
                              const Text(
                                'orvuex ai',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 36,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: -0.5,
                                ),
                              ),
                              const SizedBox(height: 24),
                              // Chips Row
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  _buildProviderChip(settings),
                                  const SizedBox(width: 12),
                                  _buildModelChip(settings),
                                ],
                              ),
                            ],
                          ),
                        ),
                      )
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.all(16),
                        itemCount: messages.length,
                        itemBuilder: (context, index) {
                          final msg = messages[index];
                          final isUser = msg.role == 'user';
                          return Align(
                            alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
                              children: [
                                if (!isUser) ...[
                                  Padding(
                                    padding: const EdgeInsets.only(top: 8.0),
                                    child: CircleAvatar(
                                      backgroundColor: Colors.white10,
                                      backgroundImage: const AssetImage('assets/images/orvuex_logo.png'),
                                      radius: 14,
                                      child: Image.asset(
                                        'assets/images/orvuex_logo.png',
                                        errorBuilder: (context, error, stackTrace) => const Icon(Icons.auto_awesome, size: 14, color: Colors.cyan),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                ],
                                Flexible(
                                  child: Container(
                                    margin: const EdgeInsets.only(bottom: 16),
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: isUser ? Colors.white12 : Colors.transparent,
                                      borderRadius: BorderRadius.circular(16),
                                    ),
                                    constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.80),
                                    child: MarkdownBody(
                                      data: msg.content,
                                      selectable: true,
                                      styleSheet: MarkdownStyleSheet(
                                        p: const TextStyle(color: Colors.white, fontSize: 16, height: 1.4),
                                        code: TextStyle(backgroundColor: Colors.black45, color: Colors.greenAccent[100], fontFamily: 'monospace'),
                                        codeblockPadding: const EdgeInsets.all(8),
                                        codeblockDecoration: BoxDecoration(
                                          color: Colors.black45,
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
              ),
              if (_isLoading)
                const Padding(
                  padding: EdgeInsets.all(8.0),
                  child: SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation<Color>(Colors.white70)),
                  ),
                ),
              SafeArea(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFF161618),
                      borderRadius: BorderRadius.circular(32),
                      border: Border.all(color: Colors.white10, width: 0.5),
                    ),
                    child: Row(
                      children: [
                        const CircleAvatar(
                          backgroundColor: Colors.transparent,
                          radius: 18,
                          child: Text('🧑‍💻', style: TextStyle(fontSize: 20)),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            controller: _controller,
                            maxLines: 4,
                            minLines: 1,
                            style: const TextStyle(color: Colors.white, fontSize: 15),
                            decoration: InputDecoration(
                              hintText: settings.selectedProvider == 'gemini'
                                  ? 'Répondre à Google Gemini'
                                  : 'Répondre à ${settings.selectedProvider[0].toUpperCase()}${settings.selectedProvider.substring(1)}',
                              hintStyle: const TextStyle(color: Colors.white38, fontSize: 14),
                              border: InputBorder.none,
                              isDense: true,
                              contentPadding: const EdgeInsets.symmetric(vertical: 10),
                            ),
                            onSubmitted: (_) => _sendMessage(),
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton(
                          icon: const Icon(Icons.mic, color: Colors.white60, size: 22),
                          onPressed: () async {
                            final text = await Navigator.push(context, MaterialPageRoute(builder: (_) => const LiveVoiceScreen()));
                            if (text != null && text is String && text.isNotEmpty && text != 'Écoute en cours...') {
                              _controller.text = text;
                            }
                          },
                        ),
                        GestureDetector(
                          onTap: _sendMessage,
                          child: Container(
                            width: 36,
                            height: 36,
                            decoration: const BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.arrow_upward, color: Colors.black, size: 18),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              )
            ],
          );
        },
      ),
    );
  }
}
