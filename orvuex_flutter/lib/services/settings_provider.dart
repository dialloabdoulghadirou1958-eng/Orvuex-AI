import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SettingsProvider with ChangeNotifier {
  final SharedPreferences _prefs;
  
  SettingsProvider(this._prefs) {
    _loadSettings();
  }

  String _apiKey = '';
  String _selectedProvider = 'openai';
  String _selectedModel = '';

  String get apiKey => _apiKey;
  String get selectedProvider => _selectedProvider;
  
  String get selectedModel {
    if (_selectedModel.isNotEmpty) return _selectedModel;
    return defaultModelFor(selectedProvider);
  }

  static String defaultModelFor(String provider) {
    switch (provider) {
      case 'openai': return 'gpt-4o';
      case 'groq': return 'llama3-8b-8192';
      case 'deepseek': return 'deepseek-chat';
      case 'mistral': return 'mistral-large-latest';
      case 'openrouter': return 'google/gemini-2.0-flash-exp:free';
      case 'gemini': return 'gemini-1.5-flash';
      default: return 'gpt-4o';
    }
  }

  static List<String> modelsFor(String provider) {
    switch (provider) {
      case 'openai': return ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'];
      case 'groq': return ['llama3-8b-8192', 'llama3-70b-8192', 'mixtral-8x7b-32768'];
      case 'deepseek': return ['deepseek-chat', 'deepseek-coder'];
      case 'mistral': return ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest'];
      case 'openrouter': return ['google/gemini-2.0-flash-exp:free', 'meta-llama/llama-3-8b-instruct:free', 'gryphe/mythomax-l2-13b'];
      case 'gemini': return ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.5-flash'];
      default: return ['gpt-4o'];
    }
  }

  void _loadSettings() {
    _apiKey = _prefs.getString('api_key') ?? '';
    _selectedProvider = _prefs.getString('provider') ?? 'openai';
    _selectedModel = _prefs.getString('selected_model') ?? '';
    notifyListeners();
  }

  Future<void> setApiKey(String key) async {
    _apiKey = key;
    await _prefs.setString('api_key', key);
    notifyListeners();
  }

  Future<void> setProvider(String provider) async {
    _selectedProvider = provider;
    _selectedModel = defaultModelFor(provider);
    await _prefs.setString('provider', provider);
    await _prefs.setString('selected_model', _selectedModel);
    notifyListeners();
  }

  Future<void> setModel(String model) async {
    _selectedModel = model;
    await _prefs.setString('selected_model', model);
    notifyListeners();
  }
}
