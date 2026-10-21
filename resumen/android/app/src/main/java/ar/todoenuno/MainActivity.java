package ar.todoenuno;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.webkit.WebViewAssetLoader;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Envoltorio nativo de la app web. Sirve los archivos desde los assets del APK con
 * WebViewAssetLoader (origen https://appassets.androidplatform.net), bloquea capturas
 * de pantalla y abre cualquier enlace externo en el navegador, nunca dentro de la app.
 */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final int PEDIR_ARCHIVO = 1;
    private static final int GUARDAR_ARCHIVO = 2;

    private WebView web;
    private ValueCallback<Uri[]> callbackArchivo;
    private String textoPorGuardar;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Ni capturas ni vista previa en "apps recientes": los saldos no quedan a la vista.
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);

        final WebViewAssetLoader cargador = new WebViewAssetLoader.Builder()
                .setDomain(HOST)
                .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#f6f5f2"));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setSupportMultipleWindows(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setGeolocationEnabled(false);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                return cargador.shouldInterceptRequest(req.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri uri = req.getUrl();
                if (HOST.equals(uri.getHost())) return false;
                if ("https".equals(uri.getScheme())) {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, uri));
                    } catch (Exception ignored) {
                    }
                }
                return true;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (callbackArchivo != null) callbackArchivo.onReceiveValue(null);
                callbackArchivo = callback;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                try {
                    startActivityForResult(Intent.createChooser(i, "Elegí un archivo"), PEDIR_ARCHIVO);
                } catch (Exception e) {
                    callbackArchivo = null;
                    return false;
                }
                return true;
            }
        });

        web.addJavascriptInterface(new Puente(), "Android");
        setContentView(web);
        web.loadUrl("https://" + HOST + "/index.html");
    }

    /** Lo único que la página puede pedirle al teléfono: guardar una copia donde elijas. */
    private class Puente {
        @JavascriptInterface
        public void guardarArchivo(final String nombre, final String texto) {
            runOnUiThread(() -> {
                textoPorGuardar = texto;
                Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("application/json");
                i.putExtra(Intent.EXTRA_TITLE, nombre);
                startActivityForResult(i, GUARDAR_ARCHIVO);
            });
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == PEDIR_ARCHIVO && callbackArchivo != null) {
            Uri[] r = (resultCode == RESULT_OK && data != null && data.getData() != null) ? new Uri[]{data.getData()} : null;
            callbackArchivo.onReceiveValue(r);
            callbackArchivo = null;
        } else if (requestCode == GUARDAR_ARCHIVO) {
            String texto = textoPorGuardar;
            textoPorGuardar = null;
            if (resultCode != RESULT_OK || data == null || data.getData() == null || texto == null) return;
            try (OutputStream out = getContentResolver().openOutputStream(data.getData())) {
                out.write(texto.getBytes(StandardCharsets.UTF_8));
                Toast.makeText(this, "Copia cifrada guardada", Toast.LENGTH_SHORT).show();
            } catch (Exception e) {
                Toast.makeText(this, "No se pudo guardar: " + e.getMessage(), Toast.LENGTH_LONG).show();
            }
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        web.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }
}
