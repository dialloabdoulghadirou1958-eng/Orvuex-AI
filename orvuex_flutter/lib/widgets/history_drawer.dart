import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/chat_provider.dart';

class HistoryDrawer extends StatelessWidget {
  const HistoryDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    return Drawer(
      backgroundColor: const Color(0xFF171717),
      child: SafeArea(
        child: Consumer<ChatProvider>(
          builder: (context, chatProvider, child) {
            final sessions = chatProvider.sessions;
            
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Row(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.asset(
                          'assets/images/orvuex_logo.png',
                          width: 32,
                          height: 32,
                          errorBuilder: (context, error, stackTrace) => const Icon(Icons.blur_on, size: 32, color: Colors.blueAccent),
                        ),
                      ),
                      const SizedBox(width: 12),
                      const Text(
                        'orvuex ai',
                        style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                    ],
                  ),
                ),
                ListTile(
                  leading: const Icon(Icons.add, color: Colors.white),
                  title: const Text('Nouveau chat', style: TextStyle(color: Colors.white)),
                  onTap: () {
                    chatProvider.createNewSession();
                    Navigator.pop(context);
                  },
                ),
                const Divider(color: Colors.white12),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                  child: Text('Historique', style: TextStyle(color: Colors.grey, fontSize: 12)),
                ),
                Expanded(
                  child: ListView.builder(
                    itemCount: sessions.length,
                    itemBuilder: (context, index) {
                      final session = sessions[index];
                      final isActive = chatProvider.activeSession?.id == session.id;
                      
                      return ListTile(
                        leading: Icon(
                          Icons.chat_bubble_outline, 
                          color: isActive ? Colors.blueAccent : Colors.white54, 
                          size: 20
                        ),
                        title: Text(
                          session.title, 
                          style: TextStyle(
                            color: isActive ? Colors.white : Colors.white70, 
                            fontSize: 14,
                            fontWeight: isActive ? FontWeight.bold : FontWeight.normal
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        trailing: IconButton(
                          icon: const Icon(Icons.delete_outline, color: Colors.white38, size: 18),
                          onPressed: () {
                            chatProvider.deleteSession(session.id);
                          },
                        ),
                        tileColor: isActive ? Colors.white.withOpacity(0.05) : null,
                        onTap: () {
                          chatProvider.setActiveSession(session.id);
                          Navigator.pop(context);
                        },
                      );
                    },
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
