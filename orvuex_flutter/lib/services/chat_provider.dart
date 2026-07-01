import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import '../models/chat_session.dart';
import '../models/chat_message.dart';

class ChatProvider with ChangeNotifier {
  final SharedPreferences _prefs;
  List<ChatSession> _sessions = [];
  String? _activeSessionId;

  ChatProvider(this._prefs) {
    _loadSessions();
  }

  List<ChatSession> get sessions => _sessions;
  
  ChatSession? get activeSession {
    if (_activeSessionId == null) return null;
    try {
      return _sessions.firstWhere((s) => s.id == _activeSessionId);
    } catch (e) {
      return null;
    }
  }

  void _loadSessions() {
    final String? data = _prefs.getString('chat_sessions');
    if (data != null) {
      try {
        final List decoded = jsonDecode(data);
        _sessions = decoded.map((s) => ChatSession.fromJson(s)).toList();
        _sessions.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      } catch (e) {
        // Handle corrupt data
      }
    }
    if (_sessions.isNotEmpty) {
      _activeSessionId = _sessions.first.id;
    } else {
      createNewSession();
    }
    notifyListeners();
  }

  Future<void> _saveSessions() async {
    final String data = jsonEncode(_sessions.map((s) => s.toJson()).toList());
    await _prefs.setString('chat_sessions', data);
  }

  void createNewSession() {
    final newSession = ChatSession(
      id: const Uuid().v4(),
      title: 'Nouvelle discussion',
      messages: [],
      createdAt: DateTime.now(),
    );
    _sessions.insert(0, newSession);
    _activeSessionId = newSession.id;
    _saveSessions();
    notifyListeners();
  }

  void setActiveSession(String id) {
    _activeSessionId = id;
    notifyListeners();
  }

  void deleteSession(String id) {
    _sessions.removeWhere((s) => s.id == id);
    if (_activeSessionId == id) {
      _activeSessionId = _sessions.isNotEmpty ? _sessions.first.id : null;
      if (_activeSessionId == null) createNewSession();
    }
    _saveSessions();
    notifyListeners();
  }

  void addMessage(String role, String content) {
    final session = activeSession;
    if (session != null) {
      session.messages.add(ChatMessage(role: role, content: content));
      
      // Auto-generate title based on first user message
      if (session.messages.length <= 2 && session.title == 'Nouvelle discussion' && role == 'user') {
        session.title = content.length > 25 ? '${content.substring(0, 25)}...' : content;
      }
      
      _saveSessions();
      notifyListeners();
    }
  }

  void appendToLastMessage(String chunk) {
    final session = activeSession;
    if (session != null && session.messages.isNotEmpty) {
      session.messages.last.content += chunk;
      notifyListeners();
      // Only save periodically or at the end to avoid excessive IO, but for simplicity here we save.
      _saveSessions();
    }
  }
}
