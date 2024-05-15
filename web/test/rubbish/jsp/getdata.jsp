<%@ page import="java.net.http.HttpClient" %>
<%@ page import="java.net.http.HttpRequest" %>
<%@ page import="java.net.URI" %>
<%@ page import="java.net.http.HttpResponse" %>
<%@ page import="java.net.http.HttpHeaders" %>
<%@ page import="java.io.IOException" %>
<%@ page import="java.util.Map" %>
<%@ page import="java.util.List" %>
<%@ page import="javax.xml.parsers.DocumentBuilderFactory" %>
<%@ page import="javax.xml.parsers.DocumentBuilder" %>
<%@ page import="javax.xml.parsers.ParserConfigurationException" %>
<%@ page import="org.xml.sax.SAXException" %>
<%@ page import="org.w3c.dom.Document" %>
<%@ page import="org.w3c.dom.NodeList" %>
<%@ page import="org.w3c.dom.Node" %>
<%@ page import="org.json.JSONObject" %>
<%@ page import="org.json.XML" %><%--
  Created by IntelliJ IDEA.
  User: 30363
  Date: 2023/1/18
  Time: 下午 02:00
  To change this template use File | Settings | File Templates.
--%>
<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%
  /*路線 24 https://crd-rubbish.epd.ntpc.gov.tw/dispProject/api/line-status.ashx?lineid=235024  * */
  /*路線 60 https://crd-rubbish.epd.ntpc.gov.tw/dispProject/api/line-status.ashx?lineid=235060  * */
  boolean isReqLine24 = request.getParameter("line24") !=null;
  boolean isReqLine60 = request.getParameter("line60") !=null;
  String url = "";
  if(isReqLine24){
    url ="https://crd-rubbish.epd.ntpc.gov.tw/dispProject/api/line-status.ashx?lineid=235024";
  }
  if(isReqLine60){
    url ="https://crd-rubbish.epd.ntpc.gov.tw/dispProject/api/line-status.ashx?lineid=235060";
  }
  if(isReqLine24 || isReqLine60){
    JSONObject data = new JSONObject();
    String line = getdata(url);
    data.put("line",XML.toJSONObject(line));
    String jsonString = data.toString(4);
    out.println(jsonString);
  }
%>


<%!  String getdata(String line1uri) throws IOException {
  String line24;
  URI uri =  URI.create(line1uri);
  HttpClient httpClient = HttpClient.newBuilder().build();
  HttpRequest httpRequest= HttpRequest.newBuilder()
    .uri(uri)    .GET()    .build();
  HttpResponse<String> httpResponse = null;
  try {
    httpResponse = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
//    // print response headers
//    HttpHeaders headers = httpResponse.headers();
//
//    Map<String, List<String>> map = headers.map();
//    for (Map.Entry<String, List<String>> entry : map.entrySet()) {
//      String key = entry.getKey();
//      List<String> value = entry.getValue();
//      out.println(key);
//    }

    // print status code
    //out.println(httpResponse.statusCode());

    // print response body
    line24 = httpResponse.body();
  } catch (InterruptedException e) {
    throw new RuntimeException(e);
  }
  return line24;
}
%>
