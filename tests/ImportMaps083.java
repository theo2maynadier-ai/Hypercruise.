import fr.hypercruise.LocalEngine;import java.io.*;import java.nio.file.*;import java.util.zip.*;
public class ImportMaps083 {
 static void check(boolean b,String text){if(!b)throw new AssertionError(text);}
 public static void main(String[] args)throws Exception{
  File dir=Files.createTempDirectory("hyper-import-test").toFile();LocalEngine e=new LocalEngine(new android.content.Context(dir,new File("app/assets")));
  try{
   check(!e.ready(),"empty status");
   try(InputStream in=new FileInputStream(args[0])){check(e.importMaps(in,t->{}).getBoolean("ready"),"valid import");}
   File w=new File(dir,"segments/W5_N40.rd5");long before=w.lastModified();
   ByteArrayOutputStream b=new ByteArrayOutputStream();try(ZipOutputStream z=new ZipOutputStream(b)){z.putNextEntry(new ZipEntry("benchmark-data/W5_N40.rd5"));z.write(new byte[]{1,2,3});z.closeEntry();}
   boolean failed=false;try{e.importMaps(new ByteArrayInputStream(b.toByteArray()),t->{});}catch(IOException ex){failed=true;}check(failed&&e.ready()&&w.lastModified()==before,"bad import preserves valid maps");
   File wrong=new File(dir,"wrong-hash.zip");try(ZipOutputStream z=new ZipOutputStream(new FileOutputStream(wrong))){z.putNextEntry(new ZipEntry("W5_N40.rd5"));byte[] zeros=new byte[65536];long left=91590083;while(left>0){int n=(int)Math.min(left,zeros.length);z.write(zeros,0,n);left-=n;}z.closeEntry();}failed=false;try(InputStream in=new FileInputStream(wrong)){e.importMaps(in,t->{});}catch(IOException ex){failed=true;}check(failed&&e.ready()&&w.lastModified()==before,"same-size wrong SHA preserves valid maps");
   b.reset();try(ZipOutputStream z=new ZipOutputStream(b)){z.putNextEntry(new ZipEntry("../escape.rd5"));z.write(1);z.closeEntry();}failed=false;try{e.importMaps(new ByteArrayInputStream(b.toByteArray()),t->{});}catch(IOException ex){failed=true;}check(failed&&e.ready(),"traversal rejected");
   for(File f:new File(dir,"segments").listFiles())check(!f.getName().endsWith(".import"),"staging cleanup");
   System.out.println("PASS: actual LocalEngine valid ZIP, corrupt ZIP, traversal rejection, existing maps preserved, staging cleaned");
  }finally{try(java.util.stream.Stream<Path> paths=Files.walk(dir.toPath())){paths.sorted(java.util.Comparator.reverseOrder()).forEach(p->{try{Files.delete(p);}catch(IOException ex){throw new RuntimeException(ex);}});}}
 }
}
