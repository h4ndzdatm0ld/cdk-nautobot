#!/bin/bash
set -e
set -o pipefail

function print_help {
    echo "Usage: ./deploy.sh --stage=dev|prod"
    echo ""
    echo "Options:"
    echo "  --stage     The deployment stage. Can be 'dev' or 'prod'."
    echo "  --help      Print this help message."
    exit 1
}

for i in "$@"
do
    case $i in
        --stage=*)
        STAGE="${i#*=}"
        shift
        ;;
        --help)
        print_help
        ;;
        *)
        # unknown option
        print_help
        ;;
    esac
done

if [ -z "$STAGE" ]; then
    echo "Please provide a stage using the --stage option"
    exit 1
fi

echo "Deploying stage: $STAGE"

cdk deploy --all --context stage=$STAGE --require-approval never
