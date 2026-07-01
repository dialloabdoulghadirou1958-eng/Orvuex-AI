import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/chat_provider.dart';

class HistoryDrawer extends StatelessWidget {
  final VoidCallback? onClose;
  
  const HistoryDrawer({super.key, this.onClose});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: MediaQuery.of(context).size.width * 0.75,
      height: double.infinity,
      color: const Color(0xFF0F0F0F),
      child: SafeArea(
        child: Consumer<ChatProvider>(
          builder: (context, chatProvider, child) {
            final sessions = chatProvider.sessions;
            
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Search Bar
                Padding(
                  padding: const EdgeInsets.only(top: 16.0, left: 16.0, right: 16.0, bottom: 24.0),
                  child: Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFF1C1C1E),
                      borderRadius: BorderRadius.circular(24),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    child: Row(
                      children: [
                        const Icon(Icons.search_rounded, color: Colors.white54, size: 20),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Text(
                            'Rechercher dans le contenu...',
                            style: TextStyle(color: Colors.white54, fontSize: 15),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                
                // History List
                Expanded(
                  child: sessions.isEmpty
                      ? const Center(
                          child: Padding(
                            padding: EdgeInsets.only(bottom: 60.0),
                            child: Text(
                              'Aucune conversation',
                              style: TextStyle(color: Colors.white54, fontSize: 16),
                            ),
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          itemCount: sessions.length,
                          itemBuilder: (context, index) {
                            final session = sessions[index];
                            final isActive = chatProvider.activeSession?.id == session.id;
                            
                            return ListTile(
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
                              title: Text(
                                session.title, 
                                style: TextStyle(
                                  color: isActive ? Colors.white : Colors.white70, 
                                  fontSize: 15,
                                  fontWeight: isActive ? FontWeight.w600 : FontWeight.normal
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              trailing: IconButton(
                                icon: const Icon(Icons.delete_outline_rounded, color: Colors.white38, size: 18),
                                onPressed: () {
                                  chatProvider.deleteSession(session.id);
                                },
                              ),
                              tileColor: isActive ? const Color(0xFF1C1C1E) : Colors.transparent,
                              onTap: () {
                                chatProvider.setActiveSession(session.id);
                                if (onClose != null) onClose!();
                              },
                            );
                          },
                        ),
                ),
                
                // Bottom Profile Section
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 20.0),
                  child: Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        clipBehavior: Clip.hardEdge,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(10),
                          color: const Color(0xFF1C1C1E),
                        ),
                        child: Image.asset(
                          'assets/images/store_icone.png',
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => const Center(
                            child: Text('👨🏻‍💻', style: TextStyle(fontSize: 22)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Abdoul Ghadirou Diallo',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            SizedBox(height: 2),
                            Text(
                              'dialloabdoulghadirou1958@gmail.com',
                              style: TextStyle(
                                color: Colors.white54,
                                fontSize: 13,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ],
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
