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
      final stream = ChatService.sendMessageStream(text, settings.apiKey, settings.selectedProvider);
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const HistoryDrawer(),
      appBar: AppBar(
        title: const Text('orvuex ai'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const SettingsScreen()));
            },
          )
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
                    ? const Center(
                        child: Text(
                          'Posez-moi une question...',
                          style: TextStyle(color: Colors.white54, fontSize: 16),
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
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 16),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: isUser ? Colors.white24 : Colors.transparent,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.85),
                              child: MarkdownBody(
                                data: msg.content,
                                selectable: true,
                                styleSheet: MarkdownStyleSheet(
                                  p: const TextStyle(color: Colors.white, fontSize: 16),
                                  code: TextStyle(backgroundColor: Colors.black45, color: Colors.greenAccent[100], fontFamily: 'monospace'),
                                  codeblockPadding: const EdgeInsets.all(8),
                                  codeblockDecoration: BoxDecoration(
                                    color: Colors.black45,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                ),
                              ),
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
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                ),
              SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _controller,
                          maxLines: 4,
                          minLines: 1,
                          decoration: InputDecoration(
                            hintText: 'Envoyer un message...',
                            filled: true,
                            fillColor: Colors.white10,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(24),
                              borderSide: BorderSide.none,
                            ),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                            suffixIcon: IconButton(
                              icon: const Icon(Icons.mic, color: Colors.white70),
                              onPressed: () {
                                Navigator.push(context, MaterialPageRoute(builder: (_) => const LiveVoiceScreen()));
                              },
                            ),
                          ),
                          onSubmitted: (_) => _sendMessage(),
                        ),
                      ),
                      const SizedBox(width: 8),
                      CircleAvatar(
                        backgroundColor: Colors.white,
                        child: IconButton(
                          icon: const Icon(Icons.arrow_upward, color: Colors.black),
                          onPressed: _sendMessage,
                        ),
                      )
                    ],
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
