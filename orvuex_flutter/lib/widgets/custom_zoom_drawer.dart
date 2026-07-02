import 'package:flutter/material.dart';

class CustomZoomDrawer extends StatefulWidget {
  final Widget menuScreen;
  final Widget mainScreen;
  final double scaleDown;
  final double slidePercent;
  final BorderRadius borderRadius;
  final Duration duration;
  final Curve curve;

  const CustomZoomDrawer({
    super.key,
    required this.menuScreen,
    required this.mainScreen,
    this.scaleDown = 0.93,
    this.slidePercent = 0.74, // Translate X to reveal 74% of the screen, leaving 26% of the chat visible
    this.borderRadius = const BorderRadius.all(Radius.circular(28.0)),
    this.duration = const Duration(milliseconds: 320),
    this.curve = Curves.fastOutSlowIn,
  });

  static CustomZoomDrawerState? of(BuildContext context) {
    return context.findAncestorStateOfType<CustomZoomDrawerState>();
  }

  @override
  State<CustomZoomDrawer> createState() => CustomZoomDrawerState();
}

class CustomZoomDrawerState extends State<CustomZoomDrawer> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: widget.duration,
    );
    _animation = CurvedAnimation(
      parent: _controller,
      curve: widget.curve,
      reverseCurve: widget.curve.flipped,
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void open() {
    _controller.forward();
  }

  void close() {
    _controller.reverse();
  }

  void toggle() {
    if (_controller.isCompleted) {
      close();
    } else {
      open();
    }
  }

  bool get isOpen => _controller.value > 0.5;

  double _dragStartX = 0.0;
  bool _isDragging = false;

  void _onHorizontalDragStart(DragStartDetails details) {
    _dragStartX = details.globalPosition.dx;
    final isClosed = _controller.value == 0.0;
    
    if (isClosed) {
      // Start dragging only from the left edge of the screen (first 40 px)
      if (_dragStartX < 40.0) {
        _isDragging = true;
      } else {
        _isDragging = false;
      }
    } else {
      // If open, we can drag anywhere on the main screen to slide it closed
      _isDragging = true;
    }
  }

  void _onHorizontalDragUpdate(DragUpdateDetails details) {
    if (!_isDragging) return;
    
    final screenWidth = MediaQuery.of(context).size.width;
    final maxSlide = screenWidth * widget.slidePercent;
    
    final delta = details.primaryDelta ?? 0.0;
    _controller.value += delta / maxSlide;
  }

  void _onHorizontalDragEnd(DragEndDetails details) {
    if (!_isDragging) return;
    _isDragging = false;
    
    final screenWidth = MediaQuery.of(context).size.width;
    final maxSlide = screenWidth * widget.slidePercent;
    
    // Support quick fling gesture
    final velocity = details.primaryVelocity ?? 0.0;
    if (velocity.abs() > 365.0) {
      if (velocity > 0) {
        _controller.fling(velocity: 1.0);
      } else {
        _controller.fling(velocity: -1.0);
      }
      return;
    }
    
    // Otherwise, snap to open or closed state
    if (_controller.value > 0.5) {
      _controller.forward();
    } else {
      _controller.reverse();
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final maxSlide = screenWidth * widget.slidePercent;

    return Stack(
      children: [
        // Menu screen remains below
        widget.menuScreen,

        // Animated main screen on top
        GestureDetector(
          onHorizontalDragStart: _onHorizontalDragStart,
          onHorizontalDragUpdate: _onHorizontalDragUpdate,
          onHorizontalDragEnd: _onHorizontalDragEnd,
          behavior: HitTestBehavior.translucent,
          child: AnimatedBuilder(
            animation: _animation,
            builder: (context, child) {
              final value = _animation.value;
              
              final slideX = value * maxSlide;
              final scale = 1.0 - (value * (1.0 - widget.scaleDown));
              final currentRadius = widget.borderRadius * value;

              return Transform.translate(
                offset: Offset(slideX, 0.0),
                child: Transform.scale(
                  scale: scale,
                  alignment: Alignment.centerLeft,
                  child: Container(
                    decoration: BoxDecoration(
                      borderRadius: currentRadius,
                      boxShadow: value > 0.01 ? [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.5 * value),
                          blurRadius: 24.0 * value,
                          spreadRadius: 2.0 * value,
                          offset: Offset(-8.0 * value, 6.0 * value),
                        )
                      ] : [],
                    ),
                    child: ClipRRect(
                      borderRadius: currentRadius,
                      child: Stack(
                        children: [
                          widget.mainScreen,
                          
                          // Tap-to-close overlay when open
                          if (value > 0.01)
                            Positioned.fill(
                              child: GestureDetector(
                                onTap: close,
                                behavior: HitTestBehavior.opaque,
                                child: Container(
                                  color: Colors.transparent,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
