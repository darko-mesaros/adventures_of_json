# Set the S3 bucket name
BUCKET_NAME=the-spicy-platypus-tiki-bar

# Set the file to upload/delete
FILE=hero.json

# AWS CLI profile (optional)
# AWS_PROFILE=your-profile

up:
	@echo "Uploading $(FILE) to $(BUCKET_NAME)"
	aws s3 cp $(FILE) s3://$(BUCKET_NAME)/lobby/$(FILE)

reset:
	@echo "Deleting $(FILE) from $(BUCKET_NAME)"
	aws s3 rm s3://$(BUCKET_NAME)/lobby/$(FILE)
