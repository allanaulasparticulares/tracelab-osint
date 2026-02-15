# 🧪 Guia de Testes - TraceLab OSINT

## 🚀 Como Testar as Ferramentas

### 1. Acesse a Página de Demonstração

Abra seu navegador e acesse:
```
http://localhost:3000/demo
```

---

## 📊 Teste 1: Metadata Intelligence

### O que testar:
- Extração de metadados EXIF/GPS/IPTC
- Análise de risco de privacidade
- Remoção de metadados

### Passo a passo:

1. **Prepare uma imagem de teste**
   - Use uma foto tirada com smartphone (contém GPS)
   - Ou baixe uma imagem de exemplo da internet
   - Formatos suportados: JPEG, JPG, PNG

2. **Extrair Metadados**
   - Clique em "📊 Metadata"
   - Selecione a imagem
   - Clique em "Extrair Metadados"
   - Aguarde o processamento (100% local)

3. **Verificar resultado**
   - ✅ Deve mostrar JSON com metadados extraídos
   - ✅ Informações de GPS (se disponível)
   - ✅ Dispositivo usado
   - ✅ Software de edição
   - ✅ Timestamps
   - ✅ Avaliação de risco (low/medium/high)

4. **Remover Metadados**
   - Com a mesma imagem selecionada
   - Clique em "Remover Metadados"
   - ✅ Deve fazer download de imagem limpa
   - ✅ Arquivo sem metadados sensíveis

### Exemplo de resultado esperado:

```json
{
  "success": true,
  "metadata": {
    "exif": {
      "Make": "Apple",
      "Model": "iPhone 13 Pro",
      "DateTime": "2024:01:15 14:30:22",
      "Software": "16.2"
    },
    "gps": {
      "latitude": -23.5505,
      "longitude": -46.6333,
      "altitude": 760
    },
    "device": {
      "make": "Apple",
      "model": "iPhone 13 Pro"
    }
  },
  "privacyRisk": {
    "riskLevel": "high",
    "warnings": [
      "GPS coordinates expose exact location",
      "Device information reveals hardware used"
    ]
  }
}
```

---

## 🔐 Teste 2: Steganography Lab

### O que testar:
- Ocultar texto em imagem PNG (Encode)
- Extrair texto oculto (Decode)
- Análise de detecção

### Passo a passo - ENCODE:

1. **Prepare uma imagem PNG**
   - Qualquer imagem PNG funciona
   - Quanto maior, mais capacidade

2. **Ocultar mensagem**
   - Clique em "🔐 Steganography"
   - Selecione modo "Encode"
   - Faça upload da imagem PNG
   - Digite texto secreto (ex: "Esta é uma mensagem secreta!")
   - (Opcional) Digite uma senha
   - Clique em "Ocultar Mensagem"

3. **Verificar resultado**
   - ✅ Deve fazer download de nova imagem PNG
   - ✅ Visualmente idêntica à original
   - ✅ Contém mensagem oculta nos bits LSB

### Passo a passo - DECODE:

1. **Usar imagem com dados ocultos**
   - Use a imagem gerada no passo anterior
   - Ou uma imagem de teste com esteganografia

2. **Extrair mensagem**
   - Selecione modo "Decode"
   - Faça upload da imagem
   - Digite a senha (se foi usada)
   - Clique em "Extrair Mensagem"

3. **Verificar resultado**
   - ✅ Deve mostrar o texto oculto
   - ✅ Se senha incorreta, texto ilegível

### Passo a passo - ANALYZE:

1. **Analisar imagem suspeita**
   - Selecione modo "Analyze"
   - Faça upload de qualquer PNG
   - Clique em "Analisar Imagem"

2. **Verificar resultado**
   - ✅ Score de suspeição (0-100)
   - ✅ Indicadores de esteganografia
   - ✅ Análise de entropia
   - ✅ Padrões LSB

---

## 🔬 Teste 3: ELA (Error Level Analysis)

### O que testar:
- Detecção de manipulação em imagens
- Geração de mapa de calor
- Identificação de regiões suspeitas

### Passo a passo:

1. **Prepare uma imagem JPEG**
   - Idealmente uma foto editada (Photoshop, etc)
   - Ou uma foto original para comparação

2. **Realizar ELA**
   - Clique em "🔬 ELA Analysis"
   - Faça upload da imagem JPEG
   - Ajuste qualidade de recompressão (padrão: 90%)
   - Clique em "Realizar ELA"

3. **Verificar resultado**
   - ✅ Imagem ELA (grayscale)
   - ✅ Mapa de calor (colorido)
   - ✅ Lista de regiões suspeitas
   - ✅ Score de manipulação (0-100)
   - ✅ Explicações educacionais

### Interpretação:

- **Áreas claras/quentes**: Possível manipulação
- **Áreas escuras/frias**: Provavelmente original
- **Texto/bordas**: Falsos positivos comuns
- **Score alto (>70)**: Suspeita de edição

---

## 🔍 Teste 4: Inconsistency Scanner

### O que testar:
- Detecção de inconsistências temporais
- Análise geoespacial
- Verificação de dispositivo/software

### Passo a passo:

1. **Prepare uma imagem com metadados**
   - Foto de smartphone com GPS
   - Ou imagem editada

2. **Escanear inconsistências**
   - Clique em "🔍 Inconsistency Scanner"
   - Faça upload da imagem
   - Clique em "Escanear Inconsistências"

3. **Verificar resultado**
   - ✅ Timeline de eventos
   - ✅ Lista de inconsistências
   - ✅ Níveis: info, warning, critical
   - ✅ Explicações detalhadas
   - ✅ Recomendações

### Tipos de inconsistências detectadas:

- **Temporal**: Datas futuras, timestamps impossíveis
- **Geoespacial**: GPS vs timezone, coordenadas inválidas
- **Dispositivo**: Combinações impossíveis (iPhone + Android)
- **Software**: Detecção de editores profissionais
- **Lógica**: Ausência suspeita de metadados

---

## 🎯 Casos de Teste Sugeridos

### Caso 1: Foto de Smartphone Original

**Arquivo**: Foto tirada com iPhone/Android
**Testes**:
1. Metadata → Deve mostrar GPS, dispositivo, timestamps
2. ELA → Score baixo (< 30)
3. Scanner → Poucas ou nenhuma inconsistência

### Caso 2: Imagem Editada no Photoshop

**Arquivo**: Foto manipulada
**Testes**:
1. Metadata → Deve mostrar "Adobe Photoshop" em software
2. ELA → Score alto (> 60), áreas editadas destacadas
3. Scanner → Inconsistências de software

### Caso 3: Imagem com Esteganografia

**Arquivo**: PNG com mensagem oculta
**Testes**:
1. Steganography Decode → Deve extrair mensagem
2. Steganography Analyze → Score alto de suspeição

### Caso 4: Imagem Sem Metadados

**Arquivo**: Screenshot ou imagem da web
**Testes**:
1. Metadata → Poucos ou nenhum metadado
2. Scanner → Alerta de "ausência suspeita"

---

## ✅ Checklist de Funcionalidades

### Metadata Intelligence
- [ ] Extração de EXIF
- [ ] Parsing de GPS
- [ ] Detecção de dispositivo
- [ ] Análise de risco
- [ ] Remoção de metadados
- [ ] Download de imagem limpa

### Steganography Lab
- [ ] Encode (LSB)
- [ ] Decode (LSB)
- [ ] Criptografia com senha
- [ ] Análise de entropia
- [ ] Detecção de padrões
- [ ] Cálculo de capacidade

### ELA Analysis
- [ ] Recompressão JPEG
- [ ] Geração de imagem ELA
- [ ] Mapa de calor
- [ ] Detecção de regiões (32x32)
- [ ] Score de manipulação
- [ ] Explicações educacionais

### Inconsistency Scanner
- [ ] Análise temporal
- [ ] Análise geoespacial
- [ ] Verificação de dispositivo
- [ ] Detecção de software
- [ ] Timeline de eventos
- [ ] Recomendações

---

## 🐛 Problemas Comuns

### "Erro ao extrair metadados"
- ✅ Verifique se o arquivo é JPEG ou PNG
- ✅ Arquivo pode estar corrompido
- ✅ Tente outra imagem

### "Nenhuma mensagem encontrada" (Steganography)
- ✅ Imagem pode não ter dados ocultos
- ✅ Senha incorreta
- ✅ Formato não é PNG

### "ELA não funciona"
- ✅ Arquivo deve ser JPEG
- ✅ PNG não suporta ELA
- ✅ Tente ajustar qualidade

### "Scanner não detecta nada"
- ✅ Imagem pode não ter metadados
- ✅ Normal para screenshots
- ✅ Use foto de smartphone para teste

---

## 📝 Notas Importantes

### Processamento Local
- ✅ **100% client-side**: Nenhum arquivo é enviado ao servidor
- ✅ **Privacidade garantida**: Dados permanecem no navegador
- ✅ **Offline-capable**: Funciona sem internet (após carregar)

### Limitações Técnicas
- ⚠️ **ELA**: Não é prova definitiva de manipulação
- ⚠️ **Steganography**: Detecta apenas LSB básico
- ⚠️ **Metadata**: Depende de dados presentes no arquivo

### Performance
- 📊 Imagens grandes (> 10MB) podem demorar
- 📊 ELA é computacionalmente intensivo
- 📊 Use Chrome/Edge para melhor performance

---

## 🎓 Aprendizado

Cada ferramenta inclui:
- ✅ Explicações contextuais
- ✅ Avisos sobre limitações
- ✅ Dicas de interpretação
- ✅ Recomendações de segurança

---

## 📞 Suporte

Problemas ou dúvidas?
- 📖 Leia `README.md`
- 🏗️ Consulte `ARCHITECTURE.md`
- 🐛 Reporte issues no GitHub

---

**Bons testes! 🚀**

*"OSINT não é espionagem. É leitura inteligente de rastros digitais."*
