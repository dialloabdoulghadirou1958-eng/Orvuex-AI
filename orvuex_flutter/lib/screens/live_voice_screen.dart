import 'package:flutter/material.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;

class LiveVoiceScreen extends StatefulWidget {
  const LiveVoiceScreen({super.key});

  @override
  State<LiveVoiceScreen> createState() => _LiveVoiceScreenState();
}

class _LiveVoiceScreenState extends State<LiveVoiceScreen> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late stt.SpeechToText _speech;
  bool _isListening = false;
  String _text = 'Écoute en cours...';

  @override
  void initState() {
    super.initState();
    _speech = stt.SpeechToText();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
    
    _initSpeech();
  }
  
  void _initSpeech() async {
    bool available = await _speech.initialize(
      onStatus: (status) => print('onStatus: $status'),
      onError: (errorNotification) => print('onError: $errorNotification'),
    );
    if (available) {
      setState(() => _isListening = true);
      _speech.listen(
        onResult: (result) => setState(() {
          _text = result.recognizedWords;
          if (result.hasConfidenceRating && result.confidence > 0) {
            // Processing logic will go here
          }
        }),
      );
    } else {
      setState(() {
        _isListening = false;
        _text = "L'autorisation du micro a été refusée.";
      });
    }
  }

  @override
  void dispose() {
    _speech.stop();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.keyboard_arrow_down, size: 32, color: Colors.white),
          onPressed: () => Navigator.pop(context, _text), // Returns the spoken text
        ),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0),
              child: Text(
                _text,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white70, fontSize: 18),
              ),
            ),
            const SizedBox(height: 80),
            AnimatedBuilder(
              animation: _controller,
              builder: (context, child) {
                return Container(
                  width: 150 + (_isListening ? _controller.value * 50 : 0),
                  height: 150 + (_isListening ? _controller.value * 50 : 0),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withOpacity(0.1 + (_isListening ? _controller.value * 0.2 : 0)),
                  ),
                  child: Center(
                    child: Container(
                      width: 100,
                      height: 100,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: _isListening ? Colors.white : Colors.grey,
                      ),
                      child: Icon(
                        _isListening ? Icons.graphic_eq : Icons.mic_off, 
                        color: Colors.black, 
                        size: 50
                      ),
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 100),
            IconButton(
              iconSize: 64,
              icon: const Icon(Icons.stop_circle, color: Colors.redAccent),
              onPressed: () {
                _speech.stop();
                setState(() => _isListening = false);
                Navigator.pop(context, _text);
              },
            )
          ],
        ),
      ),
    );
  }
}
