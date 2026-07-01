import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'screens/chat_screen.dart';
import 'services/settings_provider.dart';
import 'services/chat_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => SettingsProvider(prefs)),
        ChangeNotifierProvider(create: (_) => ChatProvider(prefs)),
      ],
      child: const OrvuexAiApp(),
    ),
  );
}

class OrvuexAiApp extends StatelessWidget {
  const OrvuexAiApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'orvuex ai',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        primaryColor: Colors.black,
        scaffoldBackgroundColor: const Color(0xFF121212),
        colorScheme: const ColorScheme.dark(
          primary: Colors.white,
          secondary: Colors.blueAccent,
        ),
      ),
      home: const ChatScreen(),
    );
  }
}
