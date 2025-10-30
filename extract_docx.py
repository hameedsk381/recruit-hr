import docx
import sys

def extract_text_from_docx(file_path):
    try:
        doc = docx.Document(file_path)
        full_text = []
        for paragraph in doc.paragraphs:
            full_text.append(paragraph.text)
        return '\n'.join(full_text)
    except Exception as e:
        return f"Error reading document: {str(e)}"

if __name__ == "__main__":
    file_path = r"c:\Users\cogni\Desktop\skillmatrix-apis\JD_Validation_Criteria.docx"
    text = extract_text_from_docx(file_path)
    print(text)