import fitz

def extract_full(pdf_path):
    doc = fitz.open(pdf_path)
    print(f"Total Pages: {len(doc)}\n")
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        text = page.get_text("text")
        print(f"\n{'='*60}")
        print(f"  PAGE {page_num + 1}")
        print(f"{'='*60}")
        print(text)

if __name__ == "__main__":
    extract_full("Sample Lab File.pdf")
