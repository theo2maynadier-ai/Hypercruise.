# Keep Android entry point and JavaScript bridge names.
-keep class fr.hypercruise.MainActivity { public <init>(); }
-keep class fr.hypercruise.MainActivity$Bridge { *; }
-keepclassmembers class * { @android.webkit.JavascriptInterface <methods>; }
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod
# BRouter uses class-name reflection for some routing internals.
-keepnames class btools.router.**
# Do not remove JNI methods if native code is introduced later.
-keepclasseswithmembernames class * { native <methods>; }
-dontwarn android.**
