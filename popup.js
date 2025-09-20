document.getElementById('file-upload').addEventListener('change', async () => 
{
    const fileUploaded = this.files.item(0);
    if (fileUploaded == null)
    {
        return;
    }
});

const form = new FormData();
form.append('purpose', 'ocr');
form.append('file', new File([fileUploaded], `${fileUploaded.name}`));