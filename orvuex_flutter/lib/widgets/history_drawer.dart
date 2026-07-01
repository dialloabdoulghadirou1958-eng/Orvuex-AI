import 'package:flutter/material.dart';

class HistoryDrawer extends StatelessWidget {
  const HistoryDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    return Drawer(
      backgroundColor: const Color(0xFF171717),
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.all(16.0),
              child: Text(
                'orvuex ai',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
              ),
            ),
            Expanded(
              child: ListView(
                children: [
                  ListTile(
                    leading: const Icon(Icons.add, color: Colors.white),
                    title: const Text('Nouveau chat', style: TextStyle(color: Colors.white)),
                    onTap: () {
                      Navigator.pop(context);
                    },
                  ),
                  const Divider(color: Colors.white12),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                    child: Text('Aujourd\'hui', style: TextStyle(color: Colors.grey, fontSize: 12)),
                  ),
                  ListTile(
                    leading: const Icon(Icons.chat_bubble_outline, color: Colors.white54, size: 20),
                    title: const Text('Discussion sur Flutter', style: TextStyle(color: Colors.white70, fontSize: 14)),
                    onTap: () {},
                  ),
                  ListTile(
                    leading: const Icon(Icons.chat_bubble_outline, color: Colors.white54, size: 20),
                    title: const Text('Architecture de l\'application', style: TextStyle(color: Colors.white70, fontSize: 14)),
                    onTap: () {},
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
