package ai.kalit.studio;

import android.graphics.Color;
import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // Android 15 / targetSdk 35 enforces edge-to-edge. Without this call the
    // WebView stops short of the gesture/nav bar and leaves a window-colored
    // gap at the bottom. Opt in explicitly and let CSS env(safe-area-inset-*)
    // own the padding for topBar / inputDock.
    WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    // Match the charcoal --body so the status/nav-bar scrims blend with the
    // app background instead of flashing black.
    getWindow().setStatusBarColor(Color.TRANSPARENT);
    getWindow().setNavigationBarColor(Color.TRANSPARENT);
  }
}
