from PyPDF2 import PdfReader
import os

SyllabiPdfPath = "Syllabi\\"
SyllabiTxtPath = "SyllabiText\\"

Prompt = open("GptPrompt.txt", "r", encoding="utf-8").read()

def pdfAllText(pdfPath):
    text = ""
    reader = PdfReader(pdfPath)
    for i in range(len(reader.pages)):
        text += reader.pages[i].extract_text()
        text += "\n"
    return text

def copyPdfToText(pdfPath, txtPath):
    for pdf in os.listdir(pdfPath):
        a = os.path.join(pdfPath, pdf)
        b = os.path.join(txtPath, pdf.replace(".pdf", ".txt"))
        t = pdfAllText(a)
        f = open(b, "w", encoding="utf-8")
        f.write("==================[Syllabus Start]==================\n")
        f.write(t)
        f.write("\n===================[Syllabus End]===================\n")
        f.write(Prompt)
        pass


for uniPath in os.listdir(SyllabiPdfPath):

    uniPdfPath = SyllabiPdfPath + uniPath
    uniTxtPath = SyllabiTxtPath + uniPath

    if not os.path.exists(uniTxtPath):
        os.mkdir(uniTxtPath)

    copyPdfToText(uniPdfPath, uniTxtPath)

    print(uniPath)