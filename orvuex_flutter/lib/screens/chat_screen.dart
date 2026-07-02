import 'package:flutter/material.dart';
import 'dart:ui' as dart_ui;
import 'package:provider/provider.dart';
import '../services/settings_provider.dart';
import '../services/chat_provider.dart';
import '../services/chat_service.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'settings_screen.dart';
import '../widgets/history_drawer.dart';
import '../widgets/custom_zoom_drawer.dart';
import 'live_voice_screen.dart';
import '../widgets/ai_provider_logo.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _isLoading = false;

  final GlobalKey<CustomZoomDrawerState> _drawerKey = GlobalKey<CustomZoomDrawerState>();

  @override
  void initState() {
    super.initState();
    _controller.addListener(_onTextChanged);
  }

  void _onTextChanged() {
    setState(() {});
  }

  @override
  void dispose() {
    _controller.removeListener(_onTextChanged);
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

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

  void _showProviderModal(BuildContext context, SettingsProvider settings) {
    final providers = [
      {'id': 'gemini', 'label': 'Google Gemini', 'icon': 'assets/icons/gemini.png'},
      {'id': 'openai', 'label': 'OpenAI', 'icon': 'assets/icons/openai.png'},
      {'id': 'deepseek', 'label': 'DeepSeek', 'icon': 'assets/icons/deepseek.png'},
      {'id': 'groq', 'label': 'Groq', 'icon': 'assets/icons/groq.png'},
      {'id': 'mistral', 'label': 'Mistral', 'icon': 'assets/icons/mistral.png'},
      {'id': 'openrouter', 'label': 'OpenRouter', 'icon': 'assets/icons/openrouter.png'},
    ];

    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'Dismiss',
      barrierColor: Colors.black.withOpacity(0.4),
      transitionDuration: const Duration(milliseconds: 250),
      pageBuilder: (context, animation, secondaryAnimation) => const SizedBox(),
      transitionBuilder: (context, animation, secondaryAnimation, child) {
        final curvedAnimation = CurvedAnimation(parent: animation, curve: Curves.easeOutCubic);
        return BackdropFilter(
          filter: dart_ui.ImageFilter.blur(sigmaX: 10 * animation.value, sigmaY: 10 * animation.value),
          child: FadeTransition(
            opacity: curvedAnimation,
            child: ScaleTransition(
              scale: Tween<double>(begin: 0.95, end: 1.0).animate(curvedAnimation),
              child: Align(
                alignment: Alignment.center,
                child: Material(
                  color: Colors.transparent,
                  child: Container(
                    width: double.infinity,
                    margin: const EdgeInsets.symmetric(horizontal: 16),
                    padding: const EdgeInsets.only(top: 16, bottom: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF161618),
                      borderRadius: BorderRadius.circular(28),
                      border: Border.all(color: Colors.white.withOpacity(0.05)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.5),
                          blurRadius: 40,
                          spreadRadius: 10,
                        )
                      ]
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                          child: Text(
                            'FOURNISSEURS',
                            style: TextStyle(
                              color: Colors.white54,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 1.2,
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        SizedBox(
                          height: 120,
                          child: ListView.builder(
                            scrollDirection: Axis.horizontal,
                            physics: const BouncingScrollPhysics(),
                            itemCount: providers.length,
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            itemBuilder: (context, index) {
                              final p = providers[index];
                              final isSelected = settings.selectedProvider == p['id'];
                              return GestureDetector(
                                onTap: () {
                                  settings.setProvider(p['id']!);
                                  Navigator.pop(context);
                                },
                                child: Container(
                                  width: 110,
                                  margin: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: isSelected ? const Color(0xFF252436) : const Color(0xFF1E1E22),
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(
                                      color: isSelected 
                                          ? const Color(0xFF5D59A6).withOpacity(0.5) 
                                          : Colors.white.withOpacity(0.05),
                                      width: isSelected ? 2.0 : 1.0,
                                    ),
                                    boxShadow: isSelected ? [
                                      BoxShadow(
                                        color: const Color(0xFF5D59A6).withOpacity(0.3),
                                        blurRadius: 8,
                                        offset: const Offset(0, 4),
                                      )
                                    ] : null,
                                  ),
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(8),
                                        decoration: BoxDecoration(
                                          color: Colors.white.withOpacity(isSelected ? 0.08 : 0.03),
                                          shape: BoxShape.circle,
                                        ),
                                        child: AiProviderLogoWidget(
                                          providerId: p['id']!,
                                          size: 28,
                                        ),
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        p['label']!,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          color: isSelected ? Colors.white : Colors.white70,
                                          fontSize: 12,
                                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                        const SizedBox(height: 12),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  void _showModelModal(BuildContext context, SettingsProvider settings) {
    final providerModels = SettingsProvider.modelsFor(settings.selectedProvider);
    
    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'Dismiss',
      barrierColor: Colors.black.withOpacity(0.4),
      transitionDuration: const Duration(milliseconds: 250),
      pageBuilder: (context, animation, secondaryAnimation) => const SizedBox(),
      transitionBuilder: (context, animation, secondaryAnimation, child) {
        final curvedAnimation = CurvedAnimation(parent: animation, curve: Curves.easeOutCubic);
        return BackdropFilter(
          filter: dart_ui.ImageFilter.blur(sigmaX: 10 * animation.value, sigmaY: 10 * animation.value),
          child: FadeTransition(
            opacity: curvedAnimation,
            child: ScaleTransition(
              scale: Tween<double>(begin: 0.95, end: 1.0).animate(curvedAnimation),
              child: Align(
                alignment: Alignment.center,
                child: Material(
                  color: Colors.transparent,
                  child: Container(
                    width: double.infinity,
                    margin: const EdgeInsets.symmetric(horizontal: 16),
                    padding: const EdgeInsets.only(top: 16, bottom: 8),
                    constraints: BoxConstraints(
                      maxHeight: MediaQuery.of(context).size.height * 0.7,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFF161618),
                      borderRadius: BorderRadius.circular(28),
                      border: Border.all(color: Colors.white.withOpacity(0.05)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.5),
                          blurRadius: 40,
                          spreadRadius: 10,
                        )
                      ]
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                          child: Text(
                            'MODÈLES',
                            style: TextStyle(
                              color: Colors.white54,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 1.2,
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Flexible(
                          child: ListView.builder(
                            shrinkWrap: true,
                            itemCount: providerModels.length,
                            itemBuilder: (context, index) {
                              final model = providerModels[index];
                              final isSelected = settings.selectedModel == model;
                              return InkWell(
                                onTap: () {
                                  settings.setModel(model);
                                  Navigator.pop(context);
                                },
                                child: Container(
                                  margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                                  decoration: BoxDecoration(
                                    color: isSelected ? const Color(0xFF252436) : Colors.transparent,
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                  child: Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          model,
                                          style: TextStyle(
                                            color: isSelected ? Colors.blue.shade200 : Colors.white,
                                            fontSize: 16,
                                            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                                          ),
                                        ),
                                      ),
                                      if (isSelected)
                                        Icon(Icons.check_rounded, color: Colors.blue.shade300, size: 20),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                        const SizedBox(height: 8),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildProviderChip(SettingsProvider settings) {
    String displayName = 'Google...';
    switch (settings.selectedProvider) {
      case 'openai': displayName = 'OpenAI...'; break;
      case 'groq': displayName = 'Groq...'; break;
      case 'deepseek': displayName = 'DeepSeek...'; break;
      case 'mistral': displayName = 'Mistral...'; break;
      case 'openrouter': displayName = 'OpenRouter...'; break;
      case 'gemini': displayName = 'Google...'; break;
    }
    
    return GestureDetector(
      onTap: () => _showProviderModal(context, settings),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: const Color(0xFF1E1E1E),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: Colors.white.withOpacity(0.06), width: 0.8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            AiProviderLogoWidget(
              providerId: settings.selectedProvider,
              size: 14,
            ),
            const SizedBox(width: 8),
            Text(
              displayName,
              style: const TextStyle(
                color: Colors.white, 
                fontSize: 14, 
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(width: 6),
            Icon(
              Icons.keyboard_arrow_down, 
              color: Colors.white.withOpacity(0.5), 
              size: 16,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildModelChip(SettingsProvider settings) {
    String activeModel = settings.selectedModel;
    
    // Display name logic to match screenshot
    String displayName = 'Gemini...';
    if (settings.selectedProvider != 'gemini') {
      if (activeModel.length > 10) {
        displayName = '${activeModel.substring(0, 8)}...';
      } else {
        displayName = activeModel;
      }
    }

    return GestureDetector(
      onTap: () => _showModelModal(context, settings),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: const Color(0xFF1E1E1E),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: Colors.white.withOpacity(0.06), width: 0.8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              displayName,
              style: const TextStyle(
                color: Colors.white, 
                fontSize: 14, 
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(width: 6),
            Icon(
              Icons.keyboard_arrow_down, 
              color: Colors.white.withOpacity(0.5), 
              size: 16,
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final settings = Provider.of<SettingsProvider>(context);
    
    return Scaffold(
      backgroundColor: const Color(0xFF0F0F0F),
      body: CustomZoomDrawer(
        key: _drawerKey,
        menuScreen: HistoryDrawer(
          onClose: () => _drawerKey.currentState?.close(),
        ),
        mainScreen: _buildMainScaffold(settings),
      ),
    );
  }

  Widget _buildMainScaffold(SettingsProvider settings) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const MinimalistMenuIcon(),
          onPressed: () => _drawerKey.currentState?.toggle(),
        ),
        actions: [
          Consumer<ChatProvider>(
            builder: (context, chatProvider, _) => IconButton(
              icon: const Icon(Icons.edit_note, color: Colors.white, size: 28),
              onPressed: () {
                chatProvider.createNewSession();
              },
            ),
          ),
          IconButton(
            icon: const Icon(Icons.settings, color: Colors.white, size: 24),
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
                    ? Center(
                        child: SingleChildScrollView(
                          padding: const EdgeInsets.symmetric(vertical: 24),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              // Swirl Logo on dark background with subtle glow (no white background)
                              Container(
                                width: 130,
                                height: 130,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  boxShadow: [
                                    BoxShadow(
                                      color: const Color(0xFF6B4EFF).withOpacity(0.08),
                                      blurRadius: 40,
                                      spreadRadius: 4,
                                    ),
                                  ],
                                ),
                                child: Image.asset(
                                  'assets/images/orvuex_logo.png',
                                  fit: BoxFit.contain,
                                  errorBuilder: (context, error, stackTrace) {
                                    return Image.asset(
                                      'assets/logo.png',
                                      fit: BoxFit.contain,
                                      errorBuilder: (context, error, stackTrace) {
                                        return Container(
                                          width: 130,
                                          height: 130,
                                          decoration: const BoxDecoration(
                                            shape: BoxShape.circle,
                                            gradient: LinearGradient(
                                              colors: [Colors.purple, Colors.blue, Colors.cyan],
                                              begin: Alignment.topLeft,
                                              end: Alignment.bottomRight,
                                            ),
                                          ),
                                          child: const Icon(Icons.hexagon_outlined, size: 55, color: Colors.white),
                                        );
                                      },
                                    );
                                  },
                                ),
                              ),
                              const SizedBox(height: 24),
                              // Title
                              const Text(
                                'orvuex ai',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 34,
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
                                  const SizedBox(width: 10),
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
                                      backgroundColor: Colors.white,
                                      radius: 14,
                                      child: Padding(
                                        padding: const EdgeInsets.all(3),
                                        child: Image.asset(
                                          'assets/images/orvuex_logo.png',
                                          fit: BoxFit.contain,
                                          errorBuilder: (context, error, stackTrace) => const Icon(Icons.star_rounded, size: 14, color: Colors.cyan),
                                        ),
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
                  padding: const EdgeInsets.only(left: 18.0, right: 18.0, bottom: 20.0, top: 8.0),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E1E1E),
                      borderRadius: BorderRadius.circular(30),
                      border: Border.all(color: Colors.white.withOpacity(0.05), width: 0.8),
                    ),
                    child: Row(
                      children: [
                        const Padding(
                          padding: EdgeInsets.only(left: 4.0, right: 8.0),
                          child: Text(
                            '👨‍💻',
                            style: TextStyle(fontSize: 22),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            controller: _controller,
                            maxLines: 5,
                            minLines: 1,
                            style: const TextStyle(
                              color: Colors.white, 
                              fontSize: 16,
                              fontWeight: FontWeight.w400,
                            ),
                            decoration: InputDecoration(
                              hintText: settings.selectedProvider == 'gemini'
                                  ? 'Répondre à Google Gemini'
                                  : 'Répondre à ${settings.selectedProvider[0].toUpperCase()}${settings.selectedProvider.substring(1)}',
                              hintStyle: TextStyle(
                                color: Colors.white.withOpacity(0.4), 
                                fontSize: 16,
                                fontWeight: FontWeight.w400,
                              ),
                              border: InputBorder.none,
                              isDense: true,
                              contentPadding: const EdgeInsets.symmetric(vertical: 8),
                            ),
                            onSubmitted: (_) => _sendMessage(),
                          ),
                        ),
                        const SizedBox(width: 8),
                        GestureDetector(
                          onTap: _sendMessage,
                          child: Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: _controller.text.trim().isNotEmpty 
                                  ? const Color(0xFF3A3A3F)
                                  : const Color(0xFF2D2D31),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              Icons.arrow_upward, 
                              color: _controller.text.trim().isNotEmpty 
                                  ? Colors.white 
                                  : Colors.white.withOpacity(0.4), 
                              size: 18,
                            ),
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

class MinimalistMenuIcon extends StatelessWidget {
  final Color color;
  const MinimalistMenuIcon({super.key, this.color = Colors.white});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 18,
            height: 2.0,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 5),
          Container(
            width: 11,
            height: 2.0,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
        ],
      ),
    );
  }
}
