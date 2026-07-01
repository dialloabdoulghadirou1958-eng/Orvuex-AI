import 'package:flutter/material.dart';
import 'dart:ui' as dart_ui;
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

class _ChatScreenState extends State<ChatScreen> with SingleTickerProviderStateMixin {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _isLoading = false;

  bool _isDrawerOpen = false;
  late AnimationController _animationController;
  late Animation<double> _scaleAnimation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_onTextChanged);
    _animationController = AnimationController(vsync: this, duration: const Duration(milliseconds: 300));
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.85).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeOutCubic)
    );
    _slideAnimation = Tween<Offset>(begin: Offset.zero, end: const Offset(0.75, 0.0)).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeOutCubic)
    );
  }

  void _onTextChanged() {
    setState(() {});
  }

  @override
  void dispose() {
    _controller.removeListener(_onTextChanged);
    _animationController.dispose();
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _toggleDrawer() {
    setState(() {
      _isDrawerOpen = !_isDrawerOpen;
      if (_isDrawerOpen) {
        _animationController.forward();
      } else {
        _animationController.reverse();
      }
    });
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
                        Flexible(
                          child: SingleChildScrollView(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: providers.map((p) {
                                final isSelected = settings.selectedProvider == p['id'];
                                return InkWell(
                                  onTap: () {
                                    settings.setProvider(p['id']!);
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
                                        Image.asset(
                                          p['icon']!,
                                          width: 20,
                                          height: 20,
                                          errorBuilder: (_, __, ___) => const Icon(Icons.star_rounded, size: 20, color: Colors.white54),
                                        ),
                                        const SizedBox(width: 16),
                                        Expanded(
                                          child: Text(
                                            p['label']!,
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
                              }).toList(),
                            ),
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
    String displayName = 'OpenAI';
    String iconPath = 'assets/icons/openai.png';
    switch (settings.selectedProvider) {
      case 'openai': displayName = 'OpenAI'; iconPath = 'assets/icons/openai.png'; break;
      case 'groq': displayName = 'Groq'; iconPath = 'assets/icons/groq.png'; break;
      case 'deepseek': displayName = 'DeepSeek'; iconPath = 'assets/icons/deepseek.png'; break;
      case 'mistral': displayName = 'Mistral'; iconPath = 'assets/icons/mistral.png'; break;
      case 'openrouter': displayName = 'OpenRouter'; iconPath = 'assets/icons/openrouter.png'; break;
      case 'gemini': displayName = 'Google...'; iconPath = 'assets/icons/gemini.png'; break;
    }
    
    return GestureDetector(
      onTap: () => _showProviderModal(context, settings),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: const Color(0xFF1E1E22),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: Colors.white.withOpacity(0.08), width: 0.8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Image.asset(
              iconPath,
              width: 15,
              height: 15,
              errorBuilder: (_, __, ___) => const Icon(Icons.auto_awesome_rounded, color: Colors.cyanAccent, size: 14),
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
              Icons.keyboard_arrow_down_rounded, 
              color: Colors.white.withOpacity(0.4), 
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
    String displayName = activeModel;
    if (settings.selectedProvider == 'gemini') {
      displayName = 'Gemini...';
    } else if (activeModel.length > 12) {
      displayName = '${activeModel.substring(0, 10)}...';
    }

    return GestureDetector(
      onTap: () => _showModelModal(context, settings),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: const Color(0xFF1E1E22),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: Colors.white.withOpacity(0.08), width: 0.8),
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
              Icons.keyboard_arrow_down_rounded, 
              color: Colors.white.withOpacity(0.4), 
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
      body: Stack(
        children: [
          HistoryDrawer(onClose: _toggleDrawer),
          SlideTransition(
            position: _slideAnimation,
            child: ScaleTransition(
              scale: _scaleAnimation,
              alignment: Alignment.centerLeft,
              child: GestureDetector(
                onTap: _isDrawerOpen ? _toggleDrawer : null,
                child: AbsorbPointer(
                  absorbing: _isDrawerOpen,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(_isDrawerOpen ? 32.0 : 0.0),
                    child: _buildMainScaffold(settings),
                  ),
                ),
              ),
            ),
          ),
        ],
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
          icon: const Icon(Icons.menu_rounded, color: Colors.white, size: 24),
          onPressed: _toggleDrawer,
        ),
        actions: [
          Consumer<ChatProvider>(
            builder: (context, chatProvider, _) => IconButton(
              icon: const Icon(Icons.edit_square, color: Colors.white, size: 24),
              onPressed: () {
                chatProvider.createNewSession();
              },
            ),
          ),
          IconButton(
            icon: const Icon(Icons.settings_outlined, color: Colors.white, size: 24),
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
                              // Swirl Logo with Glowing Back-shadows
                              Container(
                                width: 140,
                                height: 140,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: Colors.white,
                                  boxShadow: [
                                    BoxShadow(
                                      color: const Color(0xFF6B4EFF).withOpacity(0.12),
                                      blurRadius: 40,
                                      spreadRadius: 8,
                                    ),
                                  ],
                                ),
                                padding: const EdgeInsets.all(12),
                                child: Image.asset(
                                  'assets/images/orvuex_logo.png',
                                  fit: BoxFit.contain,
                                  errorBuilder: (context, error, stackTrace) {
                                    // Fallback SVG-like or simple circular custom representation
                                    return Container(
                                      width: 140,
                                      height: 140,
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
                                  letterSpacing: -0.8,
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
                  padding: const EdgeInsets.only(left: 18.0, right: 18.0, bottom: 16.0, top: 8.0),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E1E22),
                      borderRadius: BorderRadius.circular(32),
                      border: Border.all(color: Colors.white.withOpacity(0.08), width: 0.8),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 28,
                          height: 28,
                          alignment: Alignment.center,
                          child: Image.asset(
                            'assets/images/store_icone.png',
                            errorBuilder: (context, error, stackTrace) => const Text(
                              '🧑‍💻',
                              style: TextStyle(fontSize: 20),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
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
                        const SizedBox(width: 12),
                        GestureDetector(
                          onTap: _sendMessage,
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 150),
                            width: 38,
                            height: 38,
                            decoration: BoxDecoration(
                              color: _controller.text.trim().isNotEmpty 
                                  ? Colors.white.withOpacity(0.15) 
                                  : const Color(0xFF2D2D31),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              Icons.arrow_upward_rounded, 
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
