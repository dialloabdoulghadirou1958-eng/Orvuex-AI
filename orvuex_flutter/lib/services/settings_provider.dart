import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SettingsProvider with ChangeNotifier {
  final SharedPreferences _prefs;
  
  SettingsProvider(this._prefs) {
    _loadSettings();
  }

  String _apiKey = '';
  String _selectedProvider = 'openai';

  String get apiKey => _apiKey;
  String get selectedProvider => _selectedProvider;

  void _loadSettings() {
    _apiKey = _prefs.getString('api_key') ?? '';
    _selectedProvider = _prefs.getString('provider') ?? 'openai';
    notifyListeners();
  }

  Future<void> setApiKey(String key) async {
    _apiKey = key;
    await _prefs.setString('api_key', key);
    notifyListeners();
  }

  Future<void> setProvider(String provider) async {
    _selectedProvider = provider;
    await _prefs.setString('provider', provider);
    notifyListeners();
  }
}
