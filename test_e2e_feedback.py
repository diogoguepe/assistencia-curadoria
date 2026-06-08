import urllib.request
import urllib.error
import json
import psycopg2
import time
import os

print("=== INICIANDO TESTE E2E: CICLO DE FEEDBACK ===")

# 1. Realizar a pergunta no Frontend (que fará proxy pro Backend)
frontend_ask_url = "http://frontend:3000/api/ask"
ask_payload = json.dumps({"question": "E2E Test: Qual o melhor livro de ficção tech?"}).encode('utf-8')
headers = {'Content-Type': 'application/json'}

print(f"[1] Enviando pergunta para {frontend_ask_url} ...")
req = urllib.request.Request(frontend_ask_url, data=ask_payload, headers=headers, method='POST')

try:
    with urllib.request.urlopen(req) as response:
        res_body = response.read()
        res_data = json.loads(res_body)
        
        # Extrair o ID
        corr_id = response.getheader('X-Correlation-ID') or response.getheader('x-correlation-id')
        
        if not corr_id:
            print("❌ FALHA: Nenhum X-Correlation-ID retornado pelo Frontend.")
            exit(1)
            
        print(f"✅ Sucesso! Resposta recebida. Correlation ID: {corr_id}")
        
except urllib.error.URLError as e:
    print(f"❌ FALHA de Conexão com a API: {e}")
    exit(1)

# 2. Enviar o Feedback
frontend_feedback_url = "http://frontend:3000/api/feedback"
feedback_payload = json.dumps({
    "requestId": corr_id,
    "rating": 1, # Thumbs down for this test
    "comment": "Teste automatizado E2E"
}).encode('utf-8')

print(f"[2] Enviando feedback (Rating: 1) para o ID {corr_id} ...")
req_fb = urllib.request.Request(frontend_feedback_url, data=feedback_payload, headers=headers, method='POST')

try:
    with urllib.request.urlopen(req_fb) as response_fb:
        if response_fb.status == 200:
            print("✅ Sucesso! Feedback registrado pela API.")
        else:
            print(f"❌ FALHA ao enviar feedback. HTTP {response_fb.status}")
            exit(1)
except urllib.error.URLError as e:
    print(f"❌ FALHA na requisição de Feedback: {e}")
    exit(1)

# 3. Verificar no Banco de Dados
print("[3] Conectando ao banco de dados para confirmar salvamento...")
db_url = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@db:5432/catalog_db")
time.sleep(1) # Aguardar 1 segundo para garantir gravação
try:
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()
    
    cursor.execute("SELECT question, rating, comment FROM feedbacks WHERE request_id = %s;", (corr_id,))
    row = cursor.fetchone()
    
    if row:
        print(f"✅ INCRÍVEL! Linha encontrada no banco:")
        print(f"   -> Pergunta Salva: '{row[0]}'")
        print(f"   -> Rating Salvo: {row[1]}")
        print(f"   -> Comentário: '{row[2]}'")
        print("🎉 TESTE END-TO-END PASSOU COM SUCESSO!")
    else:
        print("❌ FALHA: O banco não tem a linha com este request_id.")
        exit(1)
        
    cursor.close()
    conn.close()
except Exception as e:
    print(f"❌ FALHA de Banco de Dados: {e}")
    exit(1)
