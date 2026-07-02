import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/chat_provider.dart';
import '../models/chat_session.dart';

class HistoryDrawer extends StatelessWidget {
  final VoidCallback? onClose;
  
  const HistoryDrawer({super.key, this.onClose});

  Map<String, List<ChatSession>> _groupSessions(List<ChatSession> sessions) {
    final Map<String, List<ChatSession>> groups = {};
    for (var session in sessions) {
      final label = _getGroupLabel(session.createdAt);
      groups.putIfAbsent(label, () => []).add(session);
    }
    return groups;
  }

  String _getGroupLabel(DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final sessionDate = DateTime(date.year, date.month, date.day);
    final difference = today.difference(sessionDate).inDays;
    
    if (difference <= 7) {
      return '7 jours';
    } else if (difference <= 30) {
      return '30 jours';
    } else {
      const months = [
        'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
        'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
      ];
      if (date.month >= 1 && date.month <= 12) {
        return '${months[date.month - 1]} ${date.year}';
      }
      return 'Plus ancien';
    }
  }

  @override
  Widget build(BuildContext context) {
    final sidebarWidth = MediaQuery.of(context).size.width * 0.82;
    
    return Container(
      width: sidebarWidth,
      height: double.infinity,
      color: const Color(0xFF0F0F0F),
      child: SafeArea(
        child: Consumer<ChatProvider>(
          builder: (context, chatProvider, child) {
            final sessions = chatProvider.sessions;
            final grouped = _groupSessions(sessions);
            
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. Search Bar (Haut)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                  child: Container(
                    height: 48,
                    decoration: BoxDecoration(
                      color: const Color(0xFF161618),
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(
                        color: Colors.white.withOpacity(0.04),
                        width: 1,
                      ),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Row(
                      children: [
                        Icon(
                          Icons.search_rounded, 
                          color: Colors.white.withOpacity(0.4), 
                          size: 20
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'Rechercher dans le contenu du ch...',
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.4), 
                              fontSize: 14,
                              fontWeight: FontWeight.w400,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                
                const SizedBox(height: 12),
                
                // 2. Zone de Liste (Centre - Scrollable)
                Expanded(
                  child: sessions.isEmpty
                      ? Center(
                          child: Text(
                            'Aucune discussion',
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.35), 
                              fontSize: 15
                            ),
                          ),
                        )
                      : ListView.builder(
                          physics: const BouncingScrollPhysics(),
                          padding: const EdgeInsets.only(bottom: 20.0),
                          itemCount: grouped.length,
                          itemBuilder: (context, groupIdx) {
                            final key = grouped.keys.elementAt(groupIdx);
                            final groupSessions = grouped[key]!;
                            
                            return Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Category Header (20dp à 24dp d'espace avant chaque titre sauf le premier)
                                Padding(
                                  padding: EdgeInsets.only(
                                    left: 16.0, 
                                    right: 16.0, 
                                    top: groupIdx == 0 ? 12.0 : 24.0, 
                                    bottom: 12.0
                                  ),
                                  child: Text(
                                    key,
                                    style: TextStyle(
                                      color: Colors.white.withOpacity(0.35),
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      letterSpacing: 0.3,
                                    ),
                                  ),
                                ),
                                
                                // Group Items
                                ...groupSessions.map((session) {
                                  final isActive = chatProvider.activeSession?.id == session.id;
                                  return Material(
                                    color: Colors.transparent,
                                    child: InkWell(
                                      onTap: () {
                                        chatProvider.setActiveSession(session.id);
                                        if (onClose != null) onClose!();
                                      },
                                      child: Container(
                                        width: double.infinity,
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 16.0, 
                                          vertical: 12.0
                                        ),
                                        child: Row(
                                          children: [
                                            Expanded(
                                              child: Text(
                                                session.title,
                                                style: TextStyle(
                                                  color: isActive 
                                                      ? Colors.white 
                                                      : Colors.white.withOpacity(0.7),
                                                  fontSize: 15,
                                                  fontWeight: isActive 
                                                      ? FontWeight.w600 
                                                      : FontWeight.w400,
                                                ),
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ),
                                            // Subtle elegant delete button
                                            IconButton(
                                              padding: EdgeInsets.zero,
                                              constraints: const BoxConstraints(),
                                              icon: Icon(
                                                Icons.delete_outline_rounded, 
                                                color: Colors.white.withOpacity(0.18), 
                                                size: 16
                                              ),
                                              onPressed: () {
                                                chatProvider.deleteSession(session.id);
                                              },
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  );
                                }).toList(),
                              ],
                            );
                          },
                        ),
                ),
                
                // Subtle divider above profile section
                Container(
                  height: 1,
                  margin: const EdgeInsets.symmetric(horizontal: 16.0),
                  color: Colors.white.withOpacity(0.04),
                ),
                
                // 3. Élément Profil (Bas - Ancré de façon rigide)
                Container(
                  height: 64,
                  margin: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                  child: Row(
                    children: [
                      // Circular Avatar
                      Container(
                        width: 40,
                        height: 40,
                        clipBehavior: Clip.hardEdge,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: const LinearGradient(
                            colors: [Color(0xFF2193b0), Color(0xFF6dd5ed)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                        ),
                        child: Center(
                          child: ClipOval(
                            child: Image.asset(
                              'assets/images/orvuex_logo.png',
                              width: 36,
                              height: 36,
                              fit: BoxFit.contain,
                              errorBuilder: (_, __, ___) => const Icon(
                                Icons.person, 
                                color: Colors.white, 
                                size: 20
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      
                      // Name
                      const Expanded(
                        child: Text(
                          'Abdoul ghadirou Diallo',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 15,
                            fontWeight: FontWeight.w500,
                            letterSpacing: 0.1,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      
                      // Three dots menu button
                      IconButton(
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                        icon: Icon(
                          Icons.more_horiz_rounded, 
                          color: Colors.white.withOpacity(0.45), 
                          size: 20
                        ),
                        onPressed: () {},
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
