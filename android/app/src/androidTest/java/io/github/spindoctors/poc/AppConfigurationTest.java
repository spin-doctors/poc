package io.github.spindoctors.poc;

import static org.junit.Assert.*;

import android.content.Context;
import android.content.pm.ApplicationInfo;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class AppConfigurationTest {

    @Test
    public void usesReleaseIdentityAndDisablesBackup() {
        Context appContext = InstrumentationRegistry.getInstrumentation().getTargetContext();

        assertEquals("io.github.spindoctors.poc", appContext.getPackageName());
        assertEquals(0, appContext.getApplicationInfo().flags & ApplicationInfo.FLAG_ALLOW_BACKUP);
        assertEquals(36, appContext.getApplicationInfo().targetSdkVersion);
    }
}
